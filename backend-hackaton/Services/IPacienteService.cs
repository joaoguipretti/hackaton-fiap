using Anaminese.API.DTOs;
using Anaminese.API.Models;

namespace Anaminese.API.Services;

public interface IPacienteService
{
    Task<PacienteResponse> CriarAsync(CriarPacienteRequest request);
    Task<PacienteResponse?> AtualizarAsync(string cpf, AtualizarPacienteRequest request);
    Task<PacienteResponse?> BuscarPorCpfAsync(string cpf);
    /// <summary>Retorna o paciente incluindo o ConsultorioId (usado para checagens de autorização).</summary>
    Task<Paciente?> BuscarComConsultorioAsync(string cpf);
}
