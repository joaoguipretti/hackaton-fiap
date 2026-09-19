using System.ComponentModel.DataAnnotations;
using Anaminese.API.Models;

namespace Anaminese.API.DTOs;

public record CriarConsultaRequest(
    [Required] string PacienteCpf,
    [Required] SeveridadeManchester Severidade,
    string? Observacoes,
    string? ConsultorioId
);

public record ConsultaResponse(
    string Id,
    string PacienteCpf,
    string PacienteNome,
    string ConsultorioId,
    DateTime DataConsulta,
    string Severidade,
    string Status,
    string? Observacoes,
    DateTime CriadoEm
);

public record AtualizarStatusConsultaRequest(
    [Required] StatusConsulta Status,
    SeveridadeManchester? Severidade = null
);
