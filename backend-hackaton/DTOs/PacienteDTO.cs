using System.ComponentModel.DataAnnotations;

namespace Anaminese.API.DTOs;

public record CriarPacienteRequest(
    [Required] string Cpf,
    [Required] string NomeCompleto,
    [Required] string Endereco
);

public record PacienteResponse(
    string Cpf,
    string NomeCompleto,
    string Endereco,
    DateTime CriadoEm
);
