# Glitch Form Mod Creation Guide

This guide explains how to create custom glitch forms for Pokémon in PokeRogue.

## Overview

Custom glitch forms allow you to create alternate versions of existing Pokémon with:
- Custom appearance (sprites)
- Different types
- Different abilities
- Boosted stats

## Creating a Mod JSON File

Your mod must be a single JSON file that includes all necessary data, including the sprites encoded as base64 strings.

### Basic Structure

```json
{
  "speciesId": 25,
  "formName": "Cyber Pikachu",
  "primaryType": 13,
  "secondaryType": 8,
  "abilities": [34, 9, 31],
  "stats": {
    "statsToBoost": ["SPATK", "SPD", "ATK"],
    "distributionType": "twoPriority"
  },
  "sprites": {
    "front": "BASE64_ENCODED_FRONT_SPRITE_HERE",
    "back": "BASE64_ENCODED_BACK_SPRITE_HERE"
  },
  "unlockConditions": {
    "rivalTrainerTypes": [1, 5]
  },
  "formChangeItem": 30
}
```

### Required Fields

- **speciesId**: The numeric ID of the Pokémon species (see table below)
- **formName**: A unique name for your form
- **primaryType**: The numeric ID of the primary type (see table below)
- **abilities**: Array of three ability IDs [primary, secondary, hidden]
- **stats**: Configuration for stat boosts
  - **statsToBoost**: Array of stats to prioritize for boosting ["HP", "ATK", "DEF", "SPATK", "SPDEF", "SPD"]
  - **distributionType**: How to distribute the stat boosts
    - "even": Equal distribution (33.3% each)
    - "twoPriority": Prioritize top two stats (40%, 40%, 20%)
    - "scaling": Progressive scaling (45%, 35%, 20%)
    - "topPriority": Focus on highest stat (40%, 30%, 30%)
- **sprites**: Object containing sprite data
  - **front**: Base64-encoded front sprite image (PNG format recommended)
  - **back**: Base64-encoded back sprite image (PNG format recommended)

### Optional Fields

- **secondaryType**: The numeric ID of the secondary type (if dual-typed)
- **unlockConditions**: Special conditions for unlocking this form
  - **rivalTrainerTypes**: Array of rival trainer type IDs that must be defeated
- **formChangeItem**: The item ID needed to change into this form

## Preparing Sprites

Both sprites must be prepared as PNG images and then converted to base64 strings:

1. Create your sprites in a PNG format (64x64 or 128x128 is recommended)
2. Convert the PNG files to base64 strings using an online tool like [Base64 Image Encoder](https://www.base64-image.de/)
3. Copy the base64 strings (without the data:image/png;base64, prefix) into your JSON file

## Type IDs Reference

| ID | Type |
|----|------|
| 0 | Normal |
| 1 | Fighting |
| 2 | Flying |
| 3 | Poison |
| 4 | Ground |
| 5 | Rock |
| 6 | Bug |
| 7 | Ghost |
| 8 | Steel |
| 9 | Fire |
| 10 | Water |
| 11 | Grass |
| 12 | Electric |
| 13 | Psychic |
| 14 | Ice |
| 15 | Dragon |
| 16 | Dark |
| 17 | Fairy |

## Common Species IDs

| ID | Pokémon |
|----|---------|
| 25 | Pikachu |
| 1 | Bulbasaur |
| 4 | Charmander |
| 7 | Squirtle |
| 133 | Eevee |
| 150 | Mewtwo |
| 94 | Gengar |
| 6 | Charizard |
| 149 | Dragonite |
| 143 | Snorlax |

## Uploading Your Mod

1. Create your JSON file with embedded sprites
2. In the game, go to the mod upload interface
3. Upload your JSON file
4. The mod will be automatically saved and loaded when you restart the game

## Troubleshooting

- If the upload fails, check your JSON formatting and ensure the sprites are properly base64-encoded
- Make sure all required fields are included
- Verify the sprite images are valid PNG files 