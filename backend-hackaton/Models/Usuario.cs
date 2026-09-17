using Google.Cloud.Firestore;

namespace Anaminese.API.Models;

[FirestoreData]
public class Usuario
{
    [FirestoreDocumentId]
    public string Id { get; set; } = string.Empty;

    [FirestoreProperty]
    public string Email { get; set; } = string.Empty;

    [FirestoreProperty]
    public string SenhaHash { get; set; } = string.Empty;

    [FirestoreProperty]
    public string Tipo { get; set; } = nameof(TipoUsuario.Paciente);

    [FirestoreProperty]
    public string ConsultorioId { get; set; } = string.Empty;

    /// <summary>CPF do paciente. Preenchido apenas quando Tipo = Paciente.</summary>
    [FirestoreProperty]
    public string? Cpf { get; set; }

    [FirestoreProperty]
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
}
