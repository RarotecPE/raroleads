import { norm } from "@/lib/utils";

export type ClientMunicipalityIdentity = {
  municipio: string;
  uf: string;
  codigoIbge: string | null;
};

const clean = (value: string | null | undefined) => value?.trim() || null;

export function findDuplicateMunicipalityClients<T extends ClientMunicipalityIdentity>(
  selected: ClientMunicipalityIdentity,
  clients: T[],
) {
  const selectedCode = clean(selected.codigoIbge);
  const selectedUf = selected.uf.trim().toUpperCase();
  const selectedName = norm(selected.municipio.trim());

  return clients.filter((client) => {
    const clientCode = clean(client.codigoIbge);
    if (selectedCode && clientCode) return selectedCode === clientCode;
    return client.uf.trim().toUpperCase() === selectedUf && norm(client.municipio.trim()) === selectedName;
  });
}

export function assertClientMunicipalityUnchanged(
  current: ClientMunicipalityIdentity,
  submitted: ClientMunicipalityIdentity,
) {
  const unchanged = current.municipio.trim() === submitted.municipio.trim()
    && current.uf.trim().toUpperCase() === submitted.uf.trim().toUpperCase()
    && clean(current.codigoIbge) === clean(submitted.codigoIbge);
  if (!unchanged) throw new Error("O município do cliente não pode ser alterado após o cadastro.");
}
