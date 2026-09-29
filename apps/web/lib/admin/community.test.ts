import { rescueMissionOf } from '@boia/engine/mission';
import { MemoryStorage, SAMPLE_CREW, createLocalRepository, moderatedNickname } from '@boia/store';
import { WORLD_REGISTRY } from '@boia/world';
import { describe, expect, it } from 'vitest';
import { AdminError, createAdminActions } from './actions';
import {
  EMPTY_WORLD_CONTENT,
  composeLiveWorld,
  destinationPlaces,
  mapMissionDestination,
  mapMissions,
} from './world';

/**
 * T45 en el Admin: moderación de Carnets reportados (REQ-ADM-040, O9) y el
 * destino de la Boia Fiestera por mundo, con vista previa de las partidas
 * afectadas y migración auditada (REQ-AVE-010, REQ-AVE-011). Sobre el
 * repositorio local de verdad y el mapa compartido.
 */

const registry = WORLD_REGISTRY;
const now = () => new Date('2026-09-29T10:00:00Z');

function setup() {
  const repo = createLocalRepository({ storage: new MemoryStorage(), now, watch: false });
  return { repo, actions: createAdminActions({ repo, registry, now }) };
}

const { missionId, place: character } = mapMissions(registry.map)[0]!;
const mapDestination = mapMissionDestination(registry.map, missionId)!;
/** Otra isla que puede ser destino. */
const other = destinationPlaces(registry.map).find((p) => p.id !== mapDestination.id)!;
const worldId = registry.defaultId;
const otherWorld = registry.ids().find((id) => id !== worldId)!;

describe('moderación de Carnets desde el Admin', () => {
  const member = SAMPLE_CREW[0]!;

  it('un Carnet reportado aparece en Moderación y ocultarlo queda auditado con su motivo', async () => {
    const { repo, actions } = setup();
    await repo.carnet.report(member.userId, 'apodo ofensivo');
    const [reported] = await repo.admin.carnetReports();
    expect(reported).toMatchObject({ userId: member.userId, open: 1 });
    await expect(
      actions.moderateCarnet(member.userId, { kind: 'reset_nickname' }, '  '),
    ).rejects.toBeInstanceOf(AdminError);
    await actions.moderateCarnet(member.userId, { kind: 'reset_nickname' }, 'apodo ofensivo');
    expect((await repo.carnet.get(member.userId))!.nickname).toBe(moderatedNickname(member.userId));
    const [entry] = await repo.admin.audit({ area: 'carnets' });
    expect(entry).toMatchObject({
      action: 'moderate',
      reason: 'apodo ofensivo',
      before: null,
    });
    expect((entry!.after as { nickname: string }).nickname).toBe(member.nickname);
  });
});

describe('destino de la Boia Fiestera por mundo', () => {
  it('el mapa tiene una misión con su destino y otras islas que pueden serlo', () => {
    expect(character.params?.mission).toBe(missionId);
    expect(other).toBeDefined();
  });

  it('una misión sin destino no se publica', async () => {
    const { repo, actions } = setup();
    const refuse = (placeId: string) =>
      expect(actions.setMissionDestination(worldId, missionId, placeId)).rejects.toBeInstanceOf(
        AdminError,
      );
    // Un lugar que no existe, uno que no es isla (una roca) y una isla de minijuego.
    await refuse('isla-fantasma');
    await refuse(registry.map.places.find((p) => p.category === 'obstaculo')!.id);
    await refuse(
      registry.map.places.find((p) => p.behaviors.some((b) => b.type === 'start_minigame'))!.id,
    );
    // Oculta en ese mundo, tampoco.
    await repo.admin.setSkin(worldId, other.id, { hidden: true });
    await refuse(other.id);
    // Un mundo que no existe.
    await expect(
      actions.setMissionDestination('mundo-fantasma', missionId, other.id),
    ).rejects.toBeInstanceOf(AdminError);
    expect(await repo.content.missionDestinations()).toEqual({});
  });

  it('las partidas nuevas de ese mundo van al destino nuevo; las de otro mundo, no', async () => {
    const { repo, actions } = setup();
    await actions.setMissionDestination(worldId, missionId, other.id);
    const destinations = await repo.content.missionDestinations();
    const here = composeLiveWorld(registry, worldId, {
      ...EMPTY_WORLD_CONTENT,
      missionDestinations: destinations,
    }).config;
    expect(rescueMissionOf(here, missionId)!.destination).toBe(other.id);
    const there = composeLiveWorld(registry, otherWorld, {
      ...EMPTY_WORLD_CONTENT,
      missionDestinations: destinations,
    }).config;
    expect(rescueMissionOf(there, missionId)!.destination).toBe(mapDestination.id);
    // El destino anterior conserva su premio para las partidas empezadas hacia él.
    const old = here.objects.find((o) => o.identity.id === mapDestination.id)!;
    expect(old.params?.missionReward).toEqual(mapDestination.params?.missionReward);
    // Ocultar después la isla elegida en ese mundo dejaría la misión sin destino.
    await expect(actions.setHiddenInWorld(worldId, other.id, true)).rejects.toBeInstanceOf(
      AdminError,
    );
  });

  it('vista previa de las partidas empezadas y migración auditada', async () => {
    const { repo, actions } = setup();
    await repo.progress.setMission(missionId, {
      step: 'rescued',
      data: { destination: mapDestination.id, season: worldId },
      worldId,
    });
    const preview = await actions.missionDestinationPreview(worldId, missionId, other.id);
    expect(preview).toMatchObject({ started: 1, affected: 1, completed: 0 });
    await expect(
      actions.setMissionDestination(worldId, missionId, other.id, { migrate: true }),
    ).rejects.toBeInstanceOf(AdminError);
    // Sin migrar, la empezada sigue igual.
    await actions.setMissionDestination(worldId, missionId, other.id);
    expect((await repo.progress.mission(missionId))!.data.destination).toBe(mapDestination.id);
    // Migrando, cambia, con su entrada de auditoría y el motivo.
    await actions.setMissionDestination(worldId, missionId, other.id, {
      migrate: true,
      reason: 'cambio de temporada',
    });
    expect((await repo.progress.mission(missionId))!.data.destination).toBe(other.id);
    const [migration] = await repo.admin.audit({ area: 'missions' });
    expect(migration).toMatchObject({ action: 'migrate', reason: 'cambio de temporada' });
    // Volver al destino del mapa no toca las partidas.
    await actions.setMissionDestination(worldId, missionId, null);
    expect(await repo.content.missionDestinations()).toEqual({});
    expect((await repo.progress.mission(missionId))!.data.destination).toBe(other.id);
  });
});
