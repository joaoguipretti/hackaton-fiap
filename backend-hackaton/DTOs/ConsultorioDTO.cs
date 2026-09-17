using System.ComponentModel.DataAnnotations;

namespace Anaminese.API.DTOs;

public record CriarConsultorioRequest(
    [Required] string Nome,
    [Required] string Endereco
);

public record ConsultorioResponse(
    string Id,
    string Nome,
    string Endereco,
    DateTime CriadoEm
);
