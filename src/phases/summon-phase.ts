import BattleScene from "#app/battle-scene.js";
import { BattleType } from "#app/battle.js";
import { getPokeballAtlasKey, getPokeballTintColor } from "#app/data/pokeball.js";
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
import { ChampionUtils } from "#app/system/champion-utils.js";

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

      const championId = this.scene.gameData.selectedChampionId;
      const backSpriteKey = ChampionUtils.getChampionBackSpriteKey(championId, this.scene.gameData.gender);

      if (this.scene.textures.exists(backSpriteKey)) {
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

    const pokeball = this.scene.addFieldSprite(this.player ? 36 : 248, this.player ? 80 : 44, "pb", getPokeballAtlasKey(pokemon.pokeball));
    pokeball.setVisible(false);
    pokeball.setOrigin(0.5, 0.625);
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
            pokemon.showInfo();
            pokemon.playAnim();
            pokemon.setVisible(true);
            pokemon.getSprite().setVisible(true);
            console.log(`[SUMMON_DIAG] visibility set: container=${pokemon.visible}, sprite=${pokemon.getSprite()?.visible}, x=${pokemon.x}, y=${pokemon.y}`);
            console.log(`[SUMMON_DIAG] sprite texture: ${pokemon.getSprite()?.texture?.key}, frame=${pokemon.getSprite()?.frame?.name}`);
            pokemon.setScale(0.5);
            pokemon.tint(getPokeballTintColor(pokemon.pokeball));
            pokemon.untint(250, "Sine.easeIn");
            this.scene.updateFieldScale();
            this.scene.tweens.add({
              targets: pokemon,
              duration: 250,
              ease: "Sine.easeIn",
              scale: pokemon.isGlitchOrSmittyForm() ? 0.4 : pokemon.getSpriteScale(),
              onComplete: () => {
                console.log(`[SUMMON_DIAG] scale tween complete: player=${this.player}, scale=${pokemon.scale}, visible=${pokemon.visible}`);
                pokemon.cry(pokemon.getHpRatio() > 0.25 ? undefined : { rate: 0.85 });
                pokemon.getSprite().clearTint();
                pokemon.resetSummonData();
                this.scene.time.delayedCall(1000, () => this.end());
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