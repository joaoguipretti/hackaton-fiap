using Anaminese.API.DTOs;

namespace Anaminese.API.Services;

public class ChatbotService : IChatbotService
{
    public Task<ChatbotResponse> GerarRespostaAsync(ChatbotRequest request)
    {
        var mensagem = request.Mensagem?.Trim() ?? string.Empty;
        var nome = string.IsNullOrWhiteSpace(request.Nome) ? "paciente" : request.Nome.Split(' ', StringSplitOptions.RemoveEmptyEntries)[0];
        var historico = string.IsNullOrWhiteSpace(request.HistoricoMedico) ? "Sem histórico adicional informado." : request.HistoricoMedico;

        var resposta = BuildResposta(nome, mensagem, historico, request.Idade, request.Genero);
        return Task.FromResult(new ChatbotResponse(resposta));
    }

    private static string BuildResposta(
        string nome,
        string mensagem,
        string historico,
        int? idade,
        string? genero)
    {
        var idadeTexto = idade.HasValue ? $" {idade.Value} anos" : string.Empty;
        var generoTexto = string.IsNullOrWhiteSpace(genero) ? string.Empty : $" {genero}";

        if (mensagem.Contains("dor", StringComparison.OrdinalIgnoreCase))
        {
            return $"Entendi, {nome}. Você relatou dor{(idade.HasValue ? "" : "")}. Pode me dizer em que parte do corpo está sentindo essa dor, há quanto tempo começou e qual é a intensidade de 1 a 10?";
        }

        if (mensagem.Contains("febre", StringComparison.OrdinalIgnoreCase) || mensagem.Contains("febril", StringComparison.OrdinalIgnoreCase))
        {
            return $"Entendi, {nome}. A febre foi registrada na sua descrição. Você está com outros sintomas como tosse, dor de garganta, enjoo ou fraqueza? Também me diga há quanto tempo isso começou.";
        }

        if (mensagem.Contains("tossi", StringComparison.OrdinalIgnoreCase) || mensagem.Contains("cansa", StringComparison.OrdinalIgnoreCase))
        {
            return $"Obrigado por compartilhar isso, {nome}. Posso observar que há sintomas respiratórios ou de cansaço. Me diga se houve febre, falta de ar ou se isso piora ao longo do dia.";
        }

        return $"Entendi, {nome}. Registrei que você mencionou: \"{mensagem}\". Com base no histórico informado ({historico}), pode me dizer há quanto tempo isso começou e qual a intensidade de 1 a 10?";
    }
}
