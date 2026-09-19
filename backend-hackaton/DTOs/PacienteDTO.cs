using System.ComponentModel.DataAnnotations;

namespace Anaminese.API.DTOs;

public record CriarPacienteRequest(
    [Required] string Cpf,
    [Required] string NomeCompleto,
    string? Endereco,
    string? CartaoSus,
    int Idade,
    string? Genero,
    string? Alergias,
    string? CondicoesPrevias,
    string? MedicamentosUso
);

public record AtualizarPacienteRequest(
    string? Endereco,
    string? CartaoSus,
    int Idade,
    string? Genero,
    string? Alergias,
    string? CondicoesPrevias,
    string? MedicamentosUso
);

public record PacienteResponse(
    string Cpf,
    string NomeCompleto,
    string Endereco,
    string? CartaoSus,
    int Idade,
    string? Genero,
    string? Alergias,
    string? CondicoesPrevias,
    string? MedicamentosUso,
    DateTime CriadoEm,
    bool CadastroInicialConcluido
);
