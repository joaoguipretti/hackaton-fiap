using Anaminese.API.DTOs;
using Anaminese.API.Models;

namespace Anaminese.API.Services;

public interface IUsuarioService
{
    Task<Usuario?> BuscarPorEmailAsync(string email);
    Task<Usuario?> BuscarPorIdAsync(string id);
    Task<Usuario> CriarAsync(
        string email,
        string senhaHash,
        TipoUsuario tipo,
        string consultorioId,
        string? cpf);
    Task DefinirTokenResetSenhaAsync(string usuarioId, string token, DateTime expiraEm);
    Task<Usuario?> BuscarPorTokenResetSenhaAsync(string token);
    Task RedefinirSenhaAsync(string usuarioId, string novaSenhaHash);
    UsuarioResponse ToResponse(Usuario u);
}
