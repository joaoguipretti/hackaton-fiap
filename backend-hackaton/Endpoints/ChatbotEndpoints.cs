using Anaminese.API.DTOs;
using Anaminese.API.Services;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Anaminese.API.Endpoints;

public static class ChatbotEndpoints
{
    public static RouteGroupBuilder MapChatbot(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/chat")
            .WithTags("Chatbot");

        group.MapPost("/", Responder)
            .WithName("ResponderChatbot")
            .WithSummary("Responde ao paciente em triagem inicial");

        return group;
    }

    private static async Task<Ok<ChatbotResponse>> Responder(
        ChatbotRequest request,
        IChatbotService chatbotService)
    {
        var resposta = await chatbotService.GerarRespostaAsync(request);
        return TypedResults.Ok(resposta);
    }
}
