/*
	Copyright (C) 2024  Pagefault Games

	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU Affero General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.

	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU Affero General Public License for more details.

	You should have received a copy of the GNU Affero General Public License
	along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

package account

import (
	"github.com/pagefaultgames/rogueserver/db"
)

type InfoResponse struct {
	Username        string `json:"username"`
	DiscordId       string `json:"discordId"`
	GoogleId        string `json:"googleId"`
	LastSessionSlot int    `json:"lastSessionSlot"`
}

// /account/info - get account info
func Info(username string, discordId string, googleId string, uuid []byte) (InfoResponse, error) {
	slot, _ := db.GetLatestSessionSaveDataSlot(uuid)
	response := InfoResponse{
		Username:        username,
		LastSessionSlot: slot,
		DiscordId:       discordId,
		GoogleId:        googleId,
	}
	return response, nil
}
