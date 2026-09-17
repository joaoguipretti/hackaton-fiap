using System.ComponentModel.DataAnnotations;
using Anaminese.API.Models;

namespace Anaminese.API.DTOs;

public record RegisterRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(6)] string Senha,
    [Required] TipoUsuario Tipo,
    [Required] string ConsultorioId,
    // Campos obrigatórios apenas quando Tipo = Paciente
    string? Cpf,
    string? NomeCompleto,
    string? Endereco,
    int? Idade,
    string? Genero,
    string? CartaoSus,
    string? Alergias,
    string? CondicoesPrevias,
    string? MedicamentosUso
);

public record LoginRequest(
    [Required, EmailAddress] string Email,
    [Required] string Senha
);

public record LoginResponse(
    string Token,
    DateTime ExpiraEm,
    UsuarioResponse Usuario
);

public record UsuarioResponse(
    string Id,
    string Email,
    TipoUsuario Tipo,
    string ConsultorioId,
    string? Cpf,
    DateTime CriadoEm
);
