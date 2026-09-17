using Anaminese.API.DTOs;
using Anaminese.API.Models;
using Google.Cloud.Firestore;

namespace Anaminese.API.Services;

public class ConsultaService(FirestoreDb db) : IConsultaService
{
    private const string Colecao = "consultas";

    public async Task<ConsultaResponse> CriarAsync(CriarConsultaRequest request)
    {
        var consulta = new Consulta
        {
            Id = Guid.NewGuid().ToString(),
            PacienteCpf = request.PacienteCpf,
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
        var query = db.Collection(Colecao)
            .WhereEqualTo("PacienteCpf", cpf)
            .OrderByDescending("DataConsulta");

        var snapshot = await query.GetSnapshotAsync();

        return snapshot.Documents.Select(doc =>
        {
            var consulta = doc.ConvertTo<Consulta>();
            consulta.Id = doc.Id;
            return ToResponse(consulta);
        });
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

    private static ConsultaResponse ToResponse(Consulta c) =>
        new(c.Id, c.PacienteCpf, c.DataConsulta, c.Severidade, c.Observacoes, c.CriadoEm);
}
