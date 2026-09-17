using System.ComponentModel.DataAnnotations;
using Anaminese.API.Models;

namespace Anaminese.API.DTOs;

public record CriarConsultaRequest(
    [Required] string PacienteCpf,
    [Required] SeveridadeManchester Severidade,
    string? Observacoes
);

public record ConsultaResponse(
    string Id,
    string PacienteCpf,
    string ConsultorioId,
    DateTime DataConsulta,
    string Severidade,
    string? Observacoes,
    DateTime CriadoEm
);
