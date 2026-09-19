"""Client HTTP para o backend .NET (Anaminese.API)."""
from __future__ import annotations

import httpx

from ..config import settings
from ..schemas import SeveridadeManchester


class BackendClient:
    def __init__(self, base_url: str | None = None) -> None:
        self._client = httpx.AsyncClient(
            base_url=base_url or settings.backend_dotnet_url,
            timeout=30.0,
            verify=False,  # dev local com cert self-signed do IIS Express / Kestrel
        )

    async def close(self) -> None:
        await self._client.aclose()

    async def buscar_paciente(self, cpf: str) -> dict | None:
        r = await self._client.get(f"/pacientes/{cpf}")
        if r.status_code == 404:
            return None
        r.raise_for_status()
        return r.json()

    async def criar_paciente(self, cpf: str, nome_completo: str, endereco: str) -> dict:
        r = await self._client.post(
            "/pacientes",
            json={
                "cpf": cpf,
                "nomeCompleto": nome_completo,
                "endereco": endereco,
            },
        )
        if r.status_code == 409:
            return {}
        r.raise_for_status()
        return r.json()

    async def criar_consulta(
        self,
        paciente_cpf: str,
        severidade: SeveridadeManchester,
        observacoes: str | None,
        consultorio_id: str | None = None,
    ) -> dict:
        payload = {
            "pacienteCpf": paciente_cpf,
            "severidade": int(severidade),
            "observacoes": observacoes,
        }
        if consultorio_id:
            payload["consultorioId"] = consultorio_id
        r = await self._client.post("/consultas", json=payload)
        r.raise_for_status()
        return r.json()

    async def listar_consultorios(self) -> list[dict]:
        r = await self._client.get("/consultorios")
        r.raise_for_status()
        return r.json()


_client: BackendClient | None = None


def get_backend_client() -> BackendClient:
    global _client
    if _client is None:
        _client = BackendClient()
    return _client


async def shutdown_backend_client() -> None:
    global _client
    if _client is not None:
        await _client.close()
        _client = None
