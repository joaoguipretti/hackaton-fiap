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
        var consultorioId = request.ConsultorioId ?? string.Empty;
        Paciente? paciente = null;
        var pacienteDoc = await db.Collection(PacientesCollection).Document(request.PacienteCpf).GetSnapshotAsync();
        if (pacienteDoc.Exists)
        {
            paciente = pacienteDoc.ConvertTo<Paciente>();
            if (string.IsNullOrWhiteSpace(consultorioId))
                consultorioId = paciente.ConsultorioId ?? string.Empty;
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

        return ToResponse(consulta, paciente?.NomeCompleto);
    }

    public async Task<ConsultaResponse?> BuscarPorIdAsync(string id)
    {
        var snapshot = await db.Collection(Colecao).Document(id).GetSnapshotAsync();

        if (!snapshot.Exists)
            return null;

        var consulta = snapshot.ConvertTo<Consulta>();
        consulta.Id = snapshot.Id;
        var nome = await BuscarNomePacienteAsync(consulta.PacienteCpf);
        return ToResponse(consulta, nome);
    }

    public async Task<IEnumerable<ConsultaResponse>> ListarPorPacienteAsync(string cpf)
    {
        // Sem OrderBy no Firestore pra evitar índice composto (WhereEqualTo + OrderBy).
        // Ordenamos em memória — MVP tem volume pequeno.
        var query = db.Collection(Colecao).WhereEqualTo("PacienteCpf", cpf);
        var snapshot = await query.GetSnapshotAsync();
        var nome = await BuscarNomePacienteAsync(cpf);

        return snapshot.Documents
            .Select(doc =>
            {
                var consulta = doc.ConvertTo<Consulta>();
                consulta.Id = doc.Id;
                return ToResponse(consulta, nome);
            })
            .OrderByDescending(c => c.DataConsulta);
    }

    public async Task<IEnumerable<ConsultaResponse>> ListarTodasAsync(int limite = 50)
    {
        var query = db.Collection(Colecao)
            .OrderByDescending("DataConsulta")
            .Limit(limite);

        var snapshot = await query.GetSnapshotAsync();
        var consultas = snapshot.Documents.Select(doc =>
        {
            var consulta = doc.ConvertTo<Consulta>();
            consulta.Id = doc.Id;
            return consulta;
        }).ToList();

        var nomes = await BuscarNomesPacientesAsync(consultas.Select(c => c.PacienteCpf));
        return consultas.Select(c => ToResponse(c, nomes.GetValueOrDefault(c.PacienteCpf)));
    }

    public async Task<IEnumerable<ConsultaResponse>> ListarPorConsultorioAsync(string consultorioId, int limite = 50)
    {
        // Sem OrderBy/Limit no Firestore pra evitar índice composto — ordena/limita em memória.
        var query = db.Collection(Colecao).WhereEqualTo("ConsultorioId", consultorioId);
        var snapshot = await query.GetSnapshotAsync();
        var consultas = snapshot.Documents
            .Select(doc =>
            {
                var consulta = doc.ConvertTo<Consulta>();
                consulta.Id = doc.Id;
                return consulta;
            })
            .OrderByDescending(c => c.DataConsulta)
            .Take(limite)
            .ToList();

        var nomes = await BuscarNomesPacientesAsync(consultas.Select(c => c.PacienteCpf));
        return consultas.Select(c => ToResponse(c, nomes.GetValueOrDefault(c.PacienteCpf)));
    }

    public async Task<ConsultaResponse?> AtualizarStatusAsync(string id, StatusConsulta status, SeveridadeManchester? severidade = null)
    {
        var docRef = db.Collection(Colecao).Document(id);
        var snapshot = await docRef.GetSnapshotAsync();
        if (!snapshot.Exists)
            return null;

        var consulta = snapshot.ConvertTo<Consulta>();
        consulta.Id = snapshot.Id;
        consulta.Status = status.ToString();

        var atualizacoes = new Dictionary<string, object> { ["Status"] = consulta.Status };
        if (severidade is not null)
        {
            consulta.Severidade = severidade.Value.ToString();
            atualizacoes["Severidade"] = consulta.Severidade;
        }

        await docRef.UpdateAsync(atualizacoes);

        var nome = await BuscarNomePacienteAsync(consulta.PacienteCpf);
        return ToResponse(consulta, nome);
    }

    private async Task<string?> BuscarNomePacienteAsync(string cpf)
    {
        if (string.IsNullOrWhiteSpace(cpf)) return null;
        var snapshot = await db.Collection(PacientesCollection).Document(cpf).GetSnapshotAsync();
        return snapshot.Exists ? snapshot.ConvertTo<Paciente>().NomeCompleto : null;
    }

    private async Task<Dictionary<string, string>> BuscarNomesPacientesAsync(IEnumerable<string> cpfs)
    {
        var distintos = cpfs.Where(c => !string.IsNullOrWhiteSpace(c)).Distinct().ToList();
        var resultados = await Task.WhenAll(distintos.Select(async cpf =>
        {
            var snapshot = await db.Collection(PacientesCollection).Document(cpf).GetSnapshotAsync();
            return (cpf, nome: snapshot.Exists ? snapshot.ConvertTo<Paciente>().NomeCompleto : null);
        }));

        return resultados
            .Where(r => r.nome is not null)
            .ToDictionary(r => r.cpf, r => r.nome!);
    }

    private static ConsultaResponse ToResponse(Consulta c, string? pacienteNome) =>
        new(c.Id, c.PacienteCpf, pacienteNome ?? c.PacienteCpf, c.ConsultorioId, c.DataConsulta, c.Severidade, c.Status, c.Observacoes, c.CriadoEm);
}
