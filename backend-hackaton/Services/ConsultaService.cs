using Anaminese.API.DTOs;
using Anaminese.API.Models;
using Google.Cloud.Firestore;

namespace Anaminese.API.Services;

public class ConsultaService(FirestoreDb db) : IConsultaService
{
    private const string Colecao = "consultas";
    private const string PacientesCollection = "pacientes";

    public async Task<ConsultaResponse> CriarAsync(CriarConsultaRequest request)
    {
        // Herda o ConsultorioId do paciente (se ele já existir cadastrado)
        var consultorioId = string.Empty;
        var pacienteDoc = await db.Collection(PacientesCollection).Document(request.PacienteCpf).GetSnapshotAsync();
        if (pacienteDoc.Exists)
        {
            var p = pacienteDoc.ConvertTo<Paciente>();
            consultorioId = p.ConsultorioId ?? string.Empty;
        }

        var consulta = new Consulta
        {
            Id = Guid.NewGuid().ToString(),
            PacienteCpf = request.PacienteCpf,
            ConsultorioId = consultorioId,
            DataConsulta = DateTime.UtcNow,
            Severidade = request.Severidade.ToString(),
            Observacoes = request.Observacoes,
            CriadoEm = DateTime.UtcNow
        };

        var docRef = db.Collection(Colecao).Document(consulta.Id);
        await docRef.SetAsync(consulta);

        return ToResponse(consulta);
    }

    public async Task<ConsultaResponse?> BuscarPorIdAsync(string id)
    {
        var snapshot = await db.Collection(Colecao).Document(id).GetSnapshotAsync();

        if (!snapshot.Exists)
            return null;

        var consulta = snapshot.ConvertTo<Consulta>();
        consulta.Id = snapshot.Id;
        return ToResponse(consulta);
    }

    public async Task<IEnumerable<ConsultaResponse>> ListarPorPacienteAsync(string cpf)
    {
        // Sem OrderBy no Firestore pra evitar índice composto (WhereEqualTo + OrderBy).
        // Ordenamos em memória — MVP tem volume pequeno.
        var query = db.Collection(Colecao).WhereEqualTo("PacienteCpf", cpf);
        var snapshot = await query.GetSnapshotAsync();

        return snapshot.Documents
            .Select(doc =>
            {
                var consulta = doc.ConvertTo<Consulta>();
                consulta.Id = doc.Id;
                return ToResponse(consulta);
            })
            .OrderByDescending(c => c.DataConsulta);
    }

    public async Task<IEnumerable<ConsultaResponse>> ListarTodasAsync(int limite = 50)
    {
        var query = db.Collection(Colecao)
            .OrderByDescending("DataConsulta")
            .Limit(limite);

        var snapshot = await query.GetSnapshotAsync();

        return snapshot.Documents.Select(doc =>
        {
            var consulta = doc.ConvertTo<Consulta>();
            consulta.Id = doc.Id;
            return ToResponse(consulta);
        });
    }

    public async Task<IEnumerable<ConsultaResponse>> ListarPorConsultorioAsync(string consultorioId, int limite = 50)
    {
        // Sem OrderBy/Limit no Firestore pra evitar índice composto — ordena/limita em memória.
        var query = db.Collection(Colecao).WhereEqualTo("ConsultorioId", consultorioId);
        var snapshot = await query.GetSnapshotAsync();

        return snapshot.Documents
            .Select(doc =>
            {
                var consulta = doc.ConvertTo<Consulta>();
                consulta.Id = doc.Id;
                return ToResponse(consulta);
            })
            .OrderByDescending(c => c.DataConsulta)
            .Take(limite);
    }

    private static ConsultaResponse ToResponse(Consulta c) =>
        new(c.Id, c.PacienteCpf, c.ConsultorioId, c.DataConsulta, c.Severidade, c.Observacoes, c.CriadoEm);
}
