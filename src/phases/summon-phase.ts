import BattleScene from "#app/battle-scene.js";
import { BattleType } from "#app/battle.js";
import { applyTypeBallRecolor, applyVoidBallRecolor, getPokeballAtlasKey, getPokeballTintColor } from "#app/data/pokeball.js";
import { getTypeRgb } from "#app/data/type.js";
import { PokeballType } from "#enums/pokeball";
import { SpeciesFormChangeActiveTrigger } from "#app/data/pokemon-forms.js";
import { TrainerSlot } from "#app/data/trainer-config.js";
import { PlayerGender } from "#app/enums/player-gender.js";
import { addPokeballOpenParticles } from "#app/field/anims.js";
import Pokemon, { FieldPosition } from "#app/field/pokemon.js";
import { getPokemonNameWithAffix } from "#app/messages.js";
import i18next from "i18next";
import { PartyMemberPokemonPhase } from "./party-member-pokemon-phase";
import { PostSummonPhase } from "./post-summon-phase";
import { GameOverPhase } from "./game-over-phase";
import { ShinySparklePhase } from "./shiny-sparkle-phase";
import { playPortalSummonAnim } from "#app/field/portal-anim.js";
import { TrainerType } from "#enums/trainer-type";
import { ChampionUtils } from "#app/system/champion-utils.js";
import { clearTrainerDualColorAltBuild } from "#app/utils/trainer-dualcolor-recolor.js";

export class SummonPhase extends PartyMemberPokemonPhase {
  private loaded: boolean;

  constructor(scene: BattleScene, fieldIndex: integer, player: boolean = true, loaded: boolean = false) {
    super(scene, fieldIndex, player);

    this.loaded = loaded;
  }

  start() {
    super.start();

    this.preSummon();
  }
  preSummon(): void {
    const partyMember = this.getPokemon();

    if (partyMember.isOnField() && partyMember.summonData) {
      if (partyMember.battleInfo && !partyMember.battleInfo.visible) {
        partyMember.showInfo();
      }
      this.end();
      return;
    }

    if (!partyMember.isAllowedInBattle()) {
      console.warn("The Pokemon about to be sent out is fainted or illegal under a challenge. Attempting to resolve...");
      if (partyMember.isOnField()) {
        partyMember.leaveField();
      }

      const party = this.getParty();
      const legalIndex = party.findIndex((p, i) => i > this.partyMemberIndex && p.isAllowedInBattle());
      if (legalIndex === -1) {
        this.scene.clearPhaseQueue();
        this.scene.unshiftPhase(new GameOverPhase(this.scene));
        this.end();
        return;
      }
      [party[this.partyMemberIndex], party[legalIndex]] = [party[legalIndex], party[this.partyMemberIndex]];
      console.warn("Swapped %s %O with %s %O", getPokemonNameWithAffix(partyMember), partyMember, getPokemonNameWithAffix(party[0]), party[0]);
    }

    if (this.player) {
      this.scene.ui.showText(i18next.t("battle:playerGo", { pokemonName: getPokemonNameWithAffix(this.getPokemon()) }));
      if (this.player) {
        this.scene.pbTray.hide();
      }

      const championId = ChampionUtils.resolveActiveChampionId(this.scene);
      const backSpriteKey = ChampionUtils.getChampionBackSpriteKey(championId, this.scene.gameData.gender);

      const hasTrainerTexture = this.scene.textures.exists(backSpriteKey);
      if (hasTrainerTexture) {
        this.scene.trainer.setTexture(backSpriteKey);
        this.scene.trainer.setVisible(true);
      } else {
        this.scene.trainer.setVisible(false);
      }

      const trainerScale = ChampionUtils.getChampionBackSpriteScale(championId);
      this.scene.trainer.setScale(trainerScale);
      const trainerYOffset = ChampionUtils.getChampionBackSpriteYOffset(championId);
      const currentX = this.scene.trainer.x;
      this.scene.trainer.setPosition(currentX, 186 + trainerYOffset);

      this.scene.trainer.setPipeline(this.scene.fieldSpritePipeline);
      clearTrainerDualColorAltBuild(this.scene.trainer);

      this.scene.tweens.add({
        targets: this.scene.trainer,
        x: -36,
        duration: 1000,
        onComplete: () => this.scene.trainer.setVisible(false)
      });
      this.scene.time.delayedCall(750, () => this.summon());
    } else {
      const trainerName = this.scene.currentBattle.trainer?.getName(!(this.fieldIndex % 2) ? TrainerSlot.TRAINER : TrainerSlot.TRAINER_PARTNER);
      const pokemonName = this.getPokemon().getNameToRender();
      const message = i18next.t("battle:trainerSendOut", { trainerName, pokemonName });

      this.scene.pbTrayEnemy.hide();
      this.scene.ui.showText(message, null, () => this.summon());
    }
  }

  summon(): void {
    const pokemon = this.getPokemon();

    const usePortalAnim = pokemon.species?.generation === 20 ||
      (!pokemon.isPlayer() && (this.scene.currentBattle?.trainer?.isCorrupted ||
       this.scene.currentBattle?.trainer?.config.trainerType === TrainerType.SMITTY) && pokemon.portalSprite);

    if (usePortalAnim) {
      if (this.fieldIndex === 1) {
        pokemon.setFieldPosition(FieldPosition.RIGHT, 0);
      } else {
        const availablePartyMembers = this.getParty().filter(p => p.isAllowedInBattle()).length;
        const position = !this.scene.currentBattle.double || availablePartyMembers === 1 ? FieldPosition.CENTER : FieldPosition.LEFT;
        pokemon.setFieldPosition(position);
      }
      this.scene.add.existing(pokemon);
      this.scene.field.add(pokemon);
      if (!this.player) {
        const playerPokemon = this.scene.getPlayerPokemon() as Pokemon;
        if (playerPokemon?.visible) {
          this.scene.field.moveBelow(pokemon, playerPokemon);
        }
        this.scene.currentBattle.seenEnemyPartyMemberIds.add(pokemon.id);
      }
      this.scene.updateModifiers(this.player);
      this.scene.updateFieldScale();
      pokemon.playAnim(false);
      pokemon.finalizeSummonSpriteLayout();
      if (pokemon.portalSprite) {
        pokemon.portalSprite.setAlpha(0);
      }
      pokemon.setVisible(true);
      pokemon.getSprite().setVisible(false);
      pokemon.setAlpha(1);
      playPortalSummonAnim(this.scene, pokemon).then(() => {
        pokemon.setVisible(true);
        pokemon.getSprite().setVisible(true);
        pokemon.showInfo();
        pokemon.getSprite().clearTint();
        this.scene.updateFieldScale();
        pokemon.cry(pokemon.getHpRatio() > 0.25 ? undefined : { rate: 0.85 });
        pokemon.resetSummonData();
        pokemon.finalizeSummonSpriteLayout();
        this.scene.time.delayedCall(350, () => this.end());
      });
      return;
    }

    const pokeball = this.scene.addFieldSprite(this.player ? 36 : 248, this.player ? 80 : 44, "pb", getPokeballAtlasKey(pokemon.pokeball));
    pokeball.setVisible(false);
    pokeball.setOrigin(0.5, 0.625);
    if (pokemon.typeBallType !== undefined) {
      applyTypeBallRecolor(this.scene, pokeball, pokemon.typeBallType);
    } else if (pokemon.pokeball === PokeballType.VOID_BALL) {
      applyVoidBallRecolor(this.scene, pokeball);
      pokeball.setAlpha(0.85);
    }
    this.scene.field.add(pokeball);

    if (this.fieldIndex === 1) {
      pokemon.setFieldPosition(FieldPosition.RIGHT, 0);
    } else {
      const availablePartyMembers = this.getParty().filter(p => p.isAllowedInBattle()).length;
      const position = !this.scene.currentBattle.double || availablePartyMembers === 1 ? FieldPosition.CENTER : FieldPosition.LEFT;
      pokemon.setFieldPosition(position);
    }

    const fpOffset = pokemon.getFieldPositionOffset();

    pokeball.setVisible(true);

    this.scene.tweens.add({
      targets: pokeball,
      duration: 650,
      x: (this.player ? 100 : 236) + fpOffset[0]
    });

    this.scene.tweens.add({
      targets: pokeball,
      duration: 150,
      ease: "Cubic.easeOut",
      y: (this.player ? 70 : 34) + fpOffset[1],
      onComplete: () => {
        this.scene.tweens.add({
          targets: pokeball,
          duration: 500,
          ease: "Cubic.easeIn",
          angle: 1440,
          y: (this.player ? 132 : 86) + fpOffset[1],
          onComplete: () => {
            this.scene.playSound("se/pb_rel");
            pokeball.destroy();
            this.scene.add.existing(pokemon);
            this.scene.field.add(pokemon);
            if (!this.player) {
              const playerPokemon = this.scene.getPlayerPokemon() as Pokemon;
              if (playerPokemon?.visible) {
                this.scene.field.moveBelow(pokemon, playerPokemon);
              }
              this.scene.currentBattle.seenEnemyPartyMemberIds.add(pokemon.id);
            }
            addPokeballOpenParticles(this.scene, pokemon.x, pokemon.y - 16, pokemon.pokeball);
            this.scene.updateModifiers(this.player);
            this.scene.updateFieldScale();
            pokemon.playAnim(false);
            const customLayout = pokemon.usesCustomFieldSpriteLayout();
            pokemon.setVisible(true);
            pokemon.getSprite().setVisible(true);
            pokemon.setScale(0.5);
            const summonTint = pokemon.typeBallType !== undefined
              ? Phaser.Display.Color.GetColor(...getTypeRgb(pokemon.typeBallType))
              : (pokemon.pokeball === PokeballType.VOID_BALL ? 0x2d1450 : getPokeballTintColor(pokemon.pokeball));
            pokemon.tint(summonTint);
            pokemon.untint(250, "Sine.easeIn");
            this.scene.updateFieldScale();
            this.scene.tweens.add({
              targets: pokemon,
              duration: 250,
              ease: "Sine.easeIn",
              scale: pokemon.getSpriteScale(),
              onComplete: () => {
                pokemon.showInfo();
                pokemon.cry(pokemon.getHpRatio() > 0.25 ? undefined : { rate: 0.85 });
                pokemon.getSprite().clearTint();
                pokemon.resetSummonData();
                if (customLayout) {
                  pokemon.finalizeSummonSpriteLayout();
                  this.scene.time.delayedCall(0, () => pokemon.finalizeSummonSpriteLayout());
                } else {
                  pokemon.setupBattleTooltipHover();
                }
                this.scene.time.delayedCall(350, () => this.end());
              }
            });
          }
        });
      }
    });
  }

  onEnd(): void {
    const pokemon = this.getPokemon();

    if (pokemon.isShiny()) {
      this.scene.unshiftPhase(new ShinySparklePhase(this.scene, pokemon.getBattlerIndex()));
    }

    pokemon.resetTurnData();

    if (!this.loaded || this.scene.currentBattle.battleType === BattleType.TRAINER || (this.scene.currentBattle.waveIndex % 10) === 1) {
      this.scene.triggerPokemonFormChange(pokemon, SpeciesFormChangeActiveTrigger, true);
      this.queuePostSummon();
    }
  }

  queuePostSummon(): void {
    this.scene.pushPhase(new PostSummonPhase(this.scene, this.getPokemon().getBattlerIndex()));
  }

  end() {
    this.onEnd();

    super.end();
  }
}