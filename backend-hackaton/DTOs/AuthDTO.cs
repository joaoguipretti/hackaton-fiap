using System.ComponentModel.DataAnnotations;
using Anaminese.API.Models;

namespace Anaminese.API.DTOs;

public record RegisterRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(6)] string Senha,
    [Required] TipoUsuario Tipo,
    string? ConsultorioId,
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

public record ForgotPasswordRequest(
    [Required, EmailAddress] string Email
);

public record ForgotPasswordResponse(
    string Mensagem,
    string? Token
);

public record ResetPasswordRequest(
    [Required] string Token,
    [Required, MinLength(6)] string NovaSenha
);

public record RegisterConsultorioRequest(
    [Required, EmailAddress] string Email,
    [Required, MinLength(6)] string Senha,
    [Required] string NomeConsultorio,
    [Required] string EnderecoConsultorio,
    EspecialidadeConsultorio EspecialidadeConsultorio = EspecialidadeConsultorio.ClinicaGeral,
    string? EspecialidadeOutros = null
);

public record LoginResponse(
    string Token,
    DateTime ExpiraEm,
    UsuarioResponse Usuario,
    PacienteResponse? Paciente
);

public record UsuarioResponse(
    string Id,
    string Email,
    TipoUsuario Tipo,
    string ConsultorioId,
    string? Cpf,
    DateTime CriadoEm
);
