using Google.Cloud.Firestore;

namespace Anaminese.API.Models;

[FirestoreData]
public class Paciente
{
    [FirestoreDocumentId]
    public string Cpf { get; set; } = string.Empty;

    [FirestoreProperty]
    public string NomeCompleto { get; set; } = string.Empty;

    [FirestoreProperty]
    public string Endereco { get; set; } = string.Empty;

    [FirestoreProperty]
    public DateTime CriadoEm { get; set; } = DateTime.UtcNow;
}
