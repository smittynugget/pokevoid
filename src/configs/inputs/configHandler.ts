import {Device} from "#app/enums/devices";
export function getKeyWithKeycode(config, keycode) {
  return Object.keys(config.deviceMapping).find(key => config.deviceMapping[key] === keycode);
}
export function getSettingNameWithKeycode(config, keycode) {
  const key = getKeyWithKeycode(config, keycode);
  return config.custom[key];
}
export function getIconWithKeycode(config, keycode) {
  const key = getKeyWithKeycode(config, keycode);
  return config.icons[key];
}
export function getButtonWithKeycode(config, keycode) {
  const settingName = getSettingNameWithKeycode(config, keycode);
  return config.settings[settingName];
}
export function getKeyWithSettingName(config, settingName) {
  return Object.keys(config.custom).find(key => config.custom[key] === settingName);
}
export function getSettingNameWithKey(config, key) {
  return config.custom[key];
}
export function getIconWithKey(config, key) {
  return config.icons[key];
}
export function getIconWithSettingName(config, settingName) {
  const key = getKeyWithSettingName(config, settingName);
  return getIconWithKey(config, key);
}

export function getIconForLatestInput(configs, source, devices, settingName) {
  let config;
  if (source === "gamepad") {
    config = configs[devices[Device.GAMEPAD]];
  } else {
    config = configs[devices[Device.KEYBOARD]];
  }
  const icon = getIconWithSettingName(config, settingName);
  if (!icon) {
    const isAlt = settingName.includes("ALT_");
    let altSettingName;
    if (isAlt) {
      altSettingName = settingName.split("ALT_").splice(1)[0];
    } else {
      altSettingName = `ALT_${settingName}`;
    }
    return getIconWithSettingName(config, altSettingName);
  }
  return icon;
}

export function assign(config, settingNameTarget, keycode): boolean {

  if (!canIAssignThisKey(config, getKeyWithKeycode(config, keycode)) || !canIOverrideThisSetting(config, settingNameTarget)) {
    return false;
  }
  const previousSettingName = getSettingNameWithKeycode(config, keycode);

  if (previousSettingName) {
    const previousKey = getKeyWithSettingName(config, previousSettingName);
    config.custom[previousKey] = -1;
  }

  const currentKey = getKeyWithSettingName(config, settingNameTarget);
  config.custom[currentKey] = -1;
  const newKey = getKeyWithKeycode(config, keycode);
  config.custom[newKey] = settingNameTarget;
  return true;
}

export function swap(config, settingNameTarget, keycode) {

  if (config.padType === "keyboard") {
    return false;
  }
  const prev_key = getKeyWithSettingName(config, settingNameTarget);
  const prev_settingName = getSettingNameWithKey(config, prev_key);

  const new_key = getKeyWithKeycode(config, keycode);
  const new_settingName = getSettingNameWithKey(config, new_key);

  config.custom[prev_key] = new_settingName;
  config.custom[new_key] = prev_settingName;
  return true;
}
export function deleteBind(config, settingName) {
  const key = getKeyWithSettingName(config, settingName);
  if (config.blacklist.includes(key)) {
    return false;
  }
  config.custom[key] = -1;
  return true;
}

export function canIAssignThisKey(config, key) {
  const settingName = getSettingNameWithKey(config, key);
  if (config.blacklist?.includes(key)) {
    return false;
  }
  if (settingName === -1) {
    return true;
  }
  return true;
}

export function canIOverrideThisSetting(config, settingName) {
  const key = getKeyWithSettingName(config, settingName);

  if (config.blacklist?.includes(key)) {
    return false;
  }
  return true;
}

export function canIDeleteThisKey(config, key) {
  return canIAssignThisKey(config, key);
}