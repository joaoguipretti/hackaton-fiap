using Anaminese.API.DTOs;
using Anaminese.API.Models;
using Google.Cloud.Firestore;

namespace Anaminese.API.Services;

public class ConsultorioService(FirestoreDb db) : IConsultorioService
{
    private const string Colecao = "consultorios";

    public async Task<ConsultorioResponse> CriarAsync(CriarConsultorioRequest request)
    {
        var consultorio = new Consultorio
        {
            Id = Guid.NewGuid().ToString(),
            Nome = request.Nome,
            Endereco = request.Endereco,
            CriadoEm = DateTime.UtcNow
        };

        var docRef = db.Collection(Colecao).Document(consultorio.Id);
        await docRef.SetAsync(consultorio);

        return ToResponse(consultorio);
    }

    public async Task<ConsultorioResponse?> BuscarPorIdAsync(string id)
    {
        var snapshot = await db.Collection(Colecao).Document(id).GetSnapshotAsync();

        if (!snapshot.Exists)
            return null;

        var c = snapshot.ConvertTo<Consultorio>();
        c.Id = snapshot.Id;
        return ToResponse(c);
    }

    public async Task<IEnumerable<ConsultorioResponse>> ListarTodosAsync()
    {
        var snapshot = await db.Collection(Colecao).OrderBy("Nome").GetSnapshotAsync();
        return snapshot.Documents.Select(doc =>
        {
            var c = doc.ConvertTo<Consultorio>();
            c.Id = doc.Id;
            return ToResponse(c);
        });
    }

    private static ConsultorioResponse ToResponse(Consultorio c) =>
        new(c.Id, c.Nome, c.Endereco, c.CriadoEm);
}
