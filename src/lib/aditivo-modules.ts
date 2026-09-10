import {
  ADITIVO_TIPO_EXCLUSAO_MODULO,
  ADITIVO_TIPO_INCLUSAO_MODULO,
} from "@/lib/constants";

export type AditivoModuleOption = {
  id: string;
  baseId: string;
  nome: string;
};

export function eligibleAditivoModules(
  tipo: string,
  modulos: AditivoModuleOption[],
  linkedModuleIds: Iterable<string>,
) {
  const linked = new Set(linkedModuleIds);
  if (tipo === ADITIVO_TIPO_INCLUSAO_MODULO) {
    return modulos.filter((modulo) => !linked.has(modulo.id));
  }
  if (tipo === ADITIVO_TIPO_EXCLUSAO_MODULO) {
    return modulos.filter((modulo) => linked.has(modulo.id));
  }
  return [];
}
