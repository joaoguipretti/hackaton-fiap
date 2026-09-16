using System.ComponentModel.DataAnnotations;

namespace Anaminese.API.DTOs;

public record ChatbotRequest(
    [Required] string Mensagem,
    string? Nome,
    int? Idade,
    string? Genero,
    string? HistoricoMedico
);

public record ChatbotResponse(
    string Resposta
);
