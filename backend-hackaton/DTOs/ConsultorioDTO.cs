using System.ComponentModel.DataAnnotations;
using Anaminese.API.Models;

namespace Anaminese.API.DTOs;

public record CriarConsultorioRequest(
    [Required] string Nome,
    [Required] string Endereco,
    EspecialidadeConsultorio Especialidade = EspecialidadeConsultorio.ClinicaGeral,
    string? EspecialidadeOutros = null
);

public record ConsultorioResponse(
    string Id,
    string Nome,
    string Endereco,
    string Especialidade,
    DateTime CriadoEm
);
