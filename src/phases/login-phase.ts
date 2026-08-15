import { updateUserInfo } from "#app/account.js";
import BattleScene, { bypassLogin } from "#app/battle-scene.js";
import { Phase } from "#app/phase.js";

import { Mode } from "#app/ui/ui.js";
import i18next, { t } from "i18next";
import * as Utils from "#app/utils.js";
import { SelectGenderPhase } from "./select-gender-phase";
import { UnavailablePhase } from "./unavailable-phase";
import { isDriveConnected, waitForDriveAuth } from "#app/system/drive-auth";
import { PlayerGender } from "#app/enums/player-gender.js";

export class LoginPhase extends Phase {
  private showText: boolean;
  private _loadingData = false;

  constructor(scene: BattleScene, showText?: boolean) {
    super(scene);

    this.showText = showText === undefined || !!showText;
  }

  start(): void {
    super.start();

    const hasSession = !!Utils.getCookie(Utils.sessionIdKey);

    this.scene.ui.setMode(Mode.LOADING, { buttonActions: [] });
    Utils.executeIf(bypassLogin || hasSession, updateUserInfo).then(response => {
      const success = response ? response[0] : false;
      const statusCode = response ? response[1] : null;

      const loadData = () => {
        if (this._loadingData) return;
        this._loadingData = true;
        updateUserInfo().then(async (success) => {
          this.scene.gameData.dataLoadAttempted = true;
          if (!success[0]) {
            Utils.removeCookie(Utils.sessionIdKey);
            this.scene.reset(true, true);
            return;
          }
          await waitForDriveAuth();
          if (isDriveConnected()) {
            try {
              const { driveSyncService } = await import("#app/system/drive-sync-service");
              const resolution = await driveSyncService.resolveBootSaveSource(this.scene);
              if (resolution === "reload") {
                window.location.reload();
                return;
              }
            } catch {}
          }
          this.scene.gameData.loadSystem().then(() => this.end());
        });
      };

      loadData();

      if (!success) {
        if (!statusCode || statusCode === 400) {
          if (this.showText) {
            this.scene.ui.showText(i18next.t("menu:logInOrCreateAccount"));
          }

          this.scene.playSound("menu_open");
          this.scene.ui.setMode(Mode.LOGIN_FORM, {
            buttonActions: [
              () => {
                this.scene.ui.playSelect();
                loadData();
              }, () => {
                this.scene.playSound("menu_open");
                this.scene.ui.setMode(Mode.REGISTRATION_FORM, {
                  buttonActions: [
                    () => {
                      this.scene.ui.playSelect();
                      updateUserInfo().then(success => {
                        if (!success[0]) {
                          Utils.removeCookie(Utils.sessionIdKey);
                          this.scene.reset(true, true);
                          return;
                        }
                        this.end();
                      } );
                    }, () => {
                      this.scene.unshiftPhase(new LoginPhase(this.scene, false));
                      this.end();
                    }
                  ]
                });
              }, () => {
                const redirectUri = encodeURIComponent(`${import.meta.env.VITE_SERVER_URL}/auth/discord/callback`);
                const discordId = import.meta.env.VITE_DISCORD_CLIENT_ID;
                const discordUrl = `https://discord.com/api/oauth2/authorize?client_id=${discordId}&redirect_uri=${redirectUri}&response_type=code&scope=identify&prompt=none`;
                window.open(discordUrl, "_self");
              }, () => {
                const redirectUri = encodeURIComponent(`${import.meta.env.VITE_SERVER_URL}/auth/google/callback`);
                const googleId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
                const googleUrl = `https://accounts.google.com/o/oauth2/auth?client_id=${googleId}&redirect_uri=${redirectUri}&response_type=code&scope=openid`;
                window.open(googleUrl, "_self");
              }
            ]
          });
        } else if (statusCode === 401) {
          Utils.removeCookie(Utils.sessionIdKey);
          this.scene.reset(true, true);
        } else {
          this.scene.unshiftPhase(new UnavailablePhase(this.scene));
          super.end();
        }
        return null;
      }
    });
  }

  end(): void {
    this.scene.ui.setMode(Mode.MESSAGE);
    this.scene.signalDataReady();

    const isNewPlayer = this.scene.gameData.isNewPlayer;

    if (!this.scene.gameData.gender) {
      if (isNewPlayer) {
        this.scene.gameData.gender = PlayerGender.MALE;
      } else {
        this.scene.unshiftPhase(new SelectGenderPhase(this.scene));
      }
    }

    super.end();
  }
}