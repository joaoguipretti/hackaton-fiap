using Anaminese.API.DTOs;
using Anaminese.API.Models;
using Google.Cloud.Firestore;

namespace Anaminese.API.Services;

public class PacienteService(FirestoreDb db) : IPacienteService
{
    private const string Colecao = "pacientes";

    public async Task<PacienteResponse> CriarAsync(CriarPacienteRequest request)
    {
        var paciente = new Paciente
        {
            Cpf = request.Cpf,
            NomeCompleto = request.NomeCompleto,
            Endereco = request.Endereco ?? string.Empty,
            CartaoSus = request.CartaoSus,
            Idade = request.Idade,
            Genero = request.Genero,
            Alergias = request.Alergias,
            CondicoesPrevias = request.CondicoesPrevias,
            MedicamentosUso = request.MedicamentosUso,
            CriadoEm = DateTime.UtcNow
        };

        var docRef = db.Collection(Colecao).Document(paciente.Cpf);
        await docRef.SetAsync(paciente);

        return ToResponse(paciente);
    }

    public async Task<PacienteResponse?> BuscarPorCpfAsync(string cpf)
    {
        var docRef = db.Collection(Colecao).Document(cpf);
        var snapshot = await docRef.GetSnapshotAsync();

        if (!snapshot.Exists)
            return null;

        var paciente = snapshot.ConvertTo<Paciente>();
        paciente.Cpf = snapshot.Id;
        return ToResponse(paciente);
    }

    private static PacienteResponse ToResponse(Paciente p) =>
        new(
            p.Cpf,
            p.NomeCompleto,
            p.Endereco,
            p.CartaoSus,
            p.Idade,
            p.Genero,
            p.Alergias,
            p.CondicoesPrevias,
            p.MedicamentosUso,
            p.CriadoEm);
}
