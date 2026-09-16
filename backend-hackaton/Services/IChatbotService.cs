using Anaminese.API.DTOs;

namespace Anaminese.API.Services;

public interface IChatbotService
{
    Task<ChatbotResponse> GerarRespostaAsync(ChatbotRequest request);
}
