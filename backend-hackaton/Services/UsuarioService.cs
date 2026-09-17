using Anaminese.API.DTOs;
using Anaminese.API.Models;
using Google.Cloud.Firestore;

namespace Anaminese.API.Services;

public class UsuarioService(FirestoreDb db) : IUsuarioService
{
    private const string Colecao = "usuarios";

    public async Task<Usuario?> BuscarPorEmailAsync(string email)
    {
        var normalized = email.Trim().ToLowerInvariant();
        var query = db.Collection(Colecao).WhereEqualTo("Email", normalized).Limit(1);
        var snapshot = await query.GetSnapshotAsync();

        if (snapshot.Count == 0)
            return null;

        var doc = snapshot.Documents[0];
        var u = doc.ConvertTo<Usuario>();
        u.Id = doc.Id;
        return u;
    }

    public async Task<Usuario?> BuscarPorIdAsync(string id)
    {
        var snapshot = await db.Collection(Colecao).Document(id).GetSnapshotAsync();
        if (!snapshot.Exists)
            return null;

        var u = snapshot.ConvertTo<Usuario>();
        u.Id = snapshot.Id;
        return u;
    }

    public async Task<Usuario> CriarAsync(
        string email,
        string senhaHash,
        TipoUsuario tipo,
        string consultorioId,
        string? cpf)
    {
        var usuario = new Usuario
        {
            Id = Guid.NewGuid().ToString(),
            Email = email.Trim().ToLowerInvariant(),
            SenhaHash = senhaHash,
            Tipo = tipo.ToString(),
            ConsultorioId = consultorioId,
            Cpf = cpf,
            CriadoEm = DateTime.UtcNow
        };

        var docRef = db.Collection(Colecao).Document(usuario.Id);
        await docRef.SetAsync(usuario);
        return usuario;
    }

    public UsuarioResponse ToResponse(Usuario u)
    {
        var tipo = Enum.TryParse<TipoUsuario>(u.Tipo, out var t) ? t : TipoUsuario.Paciente;
        return new UsuarioResponse(u.Id, u.Email, tipo, u.ConsultorioId, u.Cpf, u.CriadoEm);
    }
}
