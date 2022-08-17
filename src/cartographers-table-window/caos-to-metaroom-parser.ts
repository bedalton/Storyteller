// @ts-ignore
import {ipcRenderer} from "electron";

const crypto = require('crypto');
const path = require("path");

const { pointInRoom } = require('./potentialFactory');
const {common} = require('./commonFunctions.js');
const {Caos} = require('../sorcerers-table-window/parser/parser.js');
const {TreeToText} = require('../sorcerers-table-window/tree-to-text.js');
const {getDoorPotentialBetweenRooms} = require("./dataStructureFactory").dataStructureFactory;

type ParsedData = {
    id: Nullable<string>;
    name: Nullable<string>;
    background: Nullable<string>;
    x: number;
    y: number;
    width: number;
    height: number;
    rooms: { [id: string]: Room };
    perms: { [id: string]: Perm };
    music: ({ x: number; y: number; track: string; })[]
}

function parseCaosForMetaroom(codeIn: string): Nullable<ParsedData> {
    let tree = Caos(codeIn);
    let allCommands = [
        ...breakOutLoops(tree.inject.commands),
        ...breakOutLoops(tree.eventScripts)
    ];
    
    let metaroomVar = null;
    let va00Var: Nullable<string> = null;
    
    let importedJson: Nullable<ParsedData> = null;
    
    let keyMap: { [varId: number]: string } = {};
    
    const assert = (check: boolean, message?: Nullable<string>, log?: Nullable<string>) => {
        if (!check) {
            if (typeof log === 'string' && log.length == 0) {
                console.error(log);
            }
            throw new Error(message ?? "Unexpected CAOS world format");
        }
    }
    const badDoors: Perm[] = [];
    for (const command of allCommands) {
        switch (command.type) {
            case "namespaced-command":
                break;
            case "command":
                switch (command.variant) {
                    case "setv":
                        let setvArgs = command.arguments;
                        assert(setvArgs.length === 2, "Malformed metaroom file. SETV requires two arguments", `Malformed SETV in parse metaroom: ${JSON.stringify(command)}`)
                        
                        switch (setvArgs[1].variant) {
                            case "addm": {
                                let gameVariable = setvArgs[0];
                                let addmCommand = setvArgs[1];
                                assert(gameVariable.variant === "game");
                                assert(gameVariable.arguments!!.length === 1);
                                assert(gameVariable.arguments!![0].variant === "string");
                                assert(metaroomVar === null, "Only one metaroom is allowed per CAOS file", `Too many metarooms: ${JSON.stringify(metaroomVar)}`);
                                metaroomVar = gameVariable.arguments!![0].value;
                                assert(addmCommand.arguments!!.length === 5);
                                importedJson = {
                                    id: crypto.randomUUID(),
                                    name: "",
                                    x: addmCommand.arguments!![0].value,
                                    y: addmCommand.arguments!![1].value,
                                    width: addmCommand.arguments!![2].value,
                                    height: addmCommand.arguments!![3].value,
                                    background: addmCommand.arguments!![4].value + ".blk",
                                    rooms: {},
                                    perms: {},
                                    music: []
                                }
                                break;
                            }
                            
                            case "addr": {
                                assert(importedJson != null, "Metaroom not defined before reading room");
                                let va00Variable = setvArgs[0];
                                let addrCommand = setvArgs[1];
                                assert(va00Variable.variant === "va", null, `${JSON.stringify(va00Variable)}`)
                                assert(va00Variable.name === "va00", null, `${JSON.stringify(va00Variable)}`)
                                assert(addrCommand.arguments!!.length === 7);
                                assert(addrCommand.arguments!![0].variant === "game");
                                assert(addrCommand.arguments!![0].arguments!![0].value === metaroomVar, null, JSON.stringify({
                                    addrCommand,
                                    metaroomVar
                                }));
                                va00Var = crypto.randomUUID();
                                importedJson!!.rooms[va00Var!!] = {
                                    id: va00Var!!,
                                    leftX: addrCommand.arguments!![1].value - importedJson!!.x,
                                    rightX: addrCommand.arguments!![2].value - importedJson!!.x,
                                    leftCeilingY: addrCommand.arguments!![3].value - importedJson!!.y,
                                    rightCeilingY: addrCommand.arguments!![4].value - importedJson!!.y,
                                    leftFloorY: addrCommand.arguments!![5].value - importedJson!!.y,
                                    rightFloorY: addrCommand.arguments!![6].value - importedJson!!.y
                                };
                                break;
                            }
                            
                            case "va": {
                                assert(importedJson != null, "Metaroom not defined before reading room variable");
                                assert(setvArgs[1].name === "va00",  null, `${JSON.stringify(setvArgs[1])}`);
                                assert(setvArgs[0].variant === "game", null, `${JSON.stringify(setvArgs[0])}`);
                                let gameVariable = setvArgs[0];
                                keyMap[gameVariable.arguments!![0].value] = va00Var!!;
                                break;
                            }
                            
                            
                        }
                        break;
                    
                    case "rtyp":
                        assert(importedJson != null, "Metaroom not defined before reading room type");
                        let rtypArgs = command.arguments;
                        assert(rtypArgs[0].name === "va00", null, `${JSON.stringify(rtypArgs[0])}`);
                        importedJson!!.rooms[va00Var!!].roomType = rtypArgs[1].value;
                        break;
                    
                    case "door":
                        assert(importedJson != null, "Metaroom not defined before reading door");
                        let doorArgs = command.arguments;
                        assert(doorArgs.length === 3, null, `${JSON.stringify(command)}`);
                        let gameVariableA = doorArgs[0];
                        let gameVariableB = doorArgs[1];
                        let idA = keyMap[gameVariableA.arguments!![0].value];
                        let idB = keyMap[gameVariableB.arguments!![0].value];
                        if (idA == null || idB == null) {
                            badDoors.push({
                                id: common.getSortedId(gameVariableA.arguments!![0].value, gameVariableB.arguments!![0].value),
                                rooms:
                                    {
                                        a: gameVariableA.arguments!![0].value,
                                        b: gameVariableB.arguments!![0].value
                                    },
                                permeability: doorArgs[2].value
                            });
                            break;
                        }
                        let id = common.getSortedId(idA, idB);
                        importedJson!!.perms[id] = {
                            id,
                            rooms:
                                {
                                    a: idA,
                                    b: idB
                                },
                            permeability: doorArgs[2].value
                        };
                        break;
                        
                    case "rmsc":
                        assert(importedJson != null, "Music defined before metaroom", null);
                        const args = command.arguments!!;
                        importedJson!!.music.push({
                            x: args[0].value - importedJson!!.x,
                            y: args[1].value - importedJson!!.y,
                            track: args[2].value
                        })
                        break
                }
                break;
        }
    }
    if (!importedJson) {
        throw new Error("Metaroom definition not found in file.");
    }
    const rooms = importedJson.rooms;
    
    // Map music to rooms
    let done: boolean;
    const roomsUsed: string[] = [];
    music:
        for(const music of importedJson.music) {
            done = false;
            for (const roomId in rooms) {
                if (roomsUsed.indexOf(roomId) >= 0) {
                    continue;
                }
                const room = rooms[roomId];
                if (pointInRoom(music, room, false)) {
                    roomsUsed.push(roomId);
                    console.log(music.track);
                    room.music = music.track;
                    continue music;
                }
            }
        }
    
    if (badDoors.length > 0) {
        ipcRenderer.send("show-dialog", {
            title: "Parse CAOS Metaroom",
            message: "Failed to parse " + badDoors.length + " doors. DOOR references unmanaged rooms",
            buttons: ["OK"]
        });
    }
    return importedJson!!;
    
    
    /*
      .filter(val =>
          val.type === "command"
      )
      .filter(val =>
          {
              switch (val.variant) {
                case "setv":
                  for (arg of val.arguments) {
                      switch (arg.variant) {
                        case "addm":
                          return true;
                        case "addr":
                          return true;
                        default:
                          break;
                      }
                  }
                  break;
                case "mmsc":
                  return true;
                case "rtyp":
                  return true;
                case "rmsc":
                  return true;
                case "door":
                  return true;
                default:
                  break;
              }
          }
      );*/
}

function breakOutLoops(commands: CaosItem[]): CaosItem[] {
    return commands
        .flatMap((val: CaosItem) =>
            ((val.type === "command-list")
                    ? breakOutLoops((<CommandList>val).commands)
                    : [val]
            )
        );
}

/**
 *
 * @param {Metaroom} metaroom
 * @returns {string}
 */
function parseMetaroomToCaos(metaroom: Metaroom) {
    let newTree: CaosItem[] = [];
    newTree.push({
        type: "command",
        variant: "mapd",
        name: "mapd",
        arguments: [
            {
                type: "literal",
                variant: "integer",
                name: "100000",
                value: 100000
            },
            {
                type: "literal",
                variant: "integer",
                name: "100000",
                value: 100000
            }
        ]
    });
    let backgroundName = path.parse(metaroom.background).name;
    newTree.push({
        type: "command",
        variant: "setv",
        name: "setv",
        arguments: [
            {
                type: "returning-command",
                variant: "game",
                name: "game",
                arguments: [
                    {
                        type: "literal",
                        variant: "string",
                        name: `"${metaroom.id}"`,
                        value: metaroom.id
                    }
                ]
            },
            {
                type: "returning-command",
                variant: "addm",
                name: "addm",
                arguments: [
                    {
                        type: "literal",
                        variant: "integer",
                        name: `${metaroom.x}`,
                        value: metaroom.x
                    },
                    {
                        type: "literal",
                        variant: "integer",
                        name: `${metaroom.y}`,
                        value: metaroom.y
                    },
                    {
                        type: "literal",
                        variant: "integer",
                        name: `${metaroom.width}`,
                        value: metaroom.width
                    },
                    {
                        type: "literal",
                        variant: "integer",
                        name: `${metaroom.height}`,
                        value: metaroom.height
                    },
                    {
                        type: "literal",
                        variant: "string",
                        name: `"${backgroundName}"`,
                        value: backgroundName
                    }
                ]
            }
        ]
    });
    let metaroomCenterX =
        metaroom.x
        + metaroom.width / 2;
    let metaroomCenterY =
        metaroom.y
        + metaroom.height / 2;
    let music = metaroom.music ?? "";
    metaroomCenterX = Math.floor(metaroomCenterX);
    metaroomCenterY = Math.floor(metaroomCenterY);
    newTree.push({
        "type": "command",
        "variant": "mmsc",
        "name": "mmsc",
        "arguments": [
            {
                type: "literal",
                variant: "integer",
                name: `${metaroomCenterX}`,
                value: metaroomCenterX
            },
            {
                type: "literal",
                variant: "integer",
                name: `${metaroomCenterY}`,
                value: metaroomCenterY
            },
            {
                type: "literal",
                variant: "string",
                name: `"${music}"`,
                value: music
            }
        ]
    });
    for (const roomKey in metaroom.rooms) {
        let room = metaroom.rooms[roomKey];
        let roomCenterX =
            (room.leftX + room.rightX) / 2;
        let roomCenterY =
            (room.leftCeilingY + room.rightCeilingY + room.leftFloorY + room.rightFloorY) / 4
        roomCenterX = Math.floor(roomCenterX);
        roomCenterY = Math.floor(roomCenterY);
        let music = room.music ?? metaroom.music ?? "";

//ADDR (integer)
//  METAROOM_ID (integer)
//  X_LEFT (integer)
//  X_RIGHT (integer)
//  Y_LEFT_CEILING (integer)
//  Y_RIGHT_CEILING (integer)
//  Y_LEFT_FLOOR (integer)
//  Y_RIGHT_FLOOR (integer)
        newTree = [...newTree,
            {
                "type": "command",
                "variant": "setv",
                "name": "setv",
                "arguments": [
                    {
                        "type": "variable",
                        "variant": "va",
                        "name": "va00"
                    },
                    {
                        "type": "returning-command",
                        "variant": "addr",
                        "name": "addr",
                        "arguments": [
                            {
                                "type": "returning-command",
                                "variant": "game",
                                "name": "game",
                                "arguments": [
                                    {
                                        "type": "literal",
                                        "variant": "string",
                                        name: `"${metaroom.id}"`,
                                        value: metaroom.id
                                    }
                                ]
                            },
                            {
                                "type": "literal",
                                "variant": "integer",
                                name: `${room.leftX + metaroom.x}`,
                                value: room.leftX + metaroom.x
                            },
                            {
                                "type": "literal",
                                "variant": "integer",
                                name: `${room.rightX + metaroom.x}`,
                                value: room.rightX + metaroom.x
                            },
                            {
                                "type": "literal",
                                "variant": "integer",
                                name: `${room.leftCeilingY + metaroom.y}`,
                                value: room.leftCeilingY + metaroom.y
                            },
                            {
                                "type": "literal",
                                "variant": "integer",
                                name: `${room.rightCeilingY + metaroom.y}`,
                                value: room.rightCeilingY + metaroom.y
                            },
                            {
                                "type": "literal",
                                "variant": "integer",
                                name: `${room.leftFloorY + metaroom.y}`,
                                value: room.leftFloorY + metaroom.y
                            },
                            {
                                "type": "literal",
                                "variant": "integer",
                                name: `${room.rightFloorY + metaroom.y}`,
                                value: room.rightFloorY + metaroom.y
                            }
                        ]
                    }
                ]
            },
            {
                "type": "command",
                "variant": "rtyp",
                "name": "rtyp",
                "arguments": [
                    {
                        "type": "variable",
                        "variant": "va",
                        "name": "va00"
                    },
                    {
                        "type": "literal",
                        "variant": "integer",
                        name: `${room.roomType}`,
                        value: room.roomType
                    }
                ]
            },
            {
                "type": "command",
                "variant": "rmsc",
                "name": "rmsc",
                "arguments": [
                    {
                        "type": "literal",
                        "variant": "integer",
                        name: `${roomCenterX + metaroom.x}`,
                        value: roomCenterX + metaroom.x
                    },
                    {
                        "type": "literal",
                        "variant": "integer",
                        name: `${roomCenterY + metaroom.y}`,
                        value: roomCenterY + metaroom.y
                    },
                    {
                        "type": "literal",
                        "variant": "string",
                        name: `"${music}"`,
                        value: music
                    }
                ]
            },
            {
                "type": "command",
                "variant": "setv",
                "name": "setv",
                "arguments": [
                    {
                        "type": "returning-command",
                        "variant": "game",
                        "name": "game",
                        "arguments": [
                            {
                                "type": "literal",
                                "variant": "string",
                                name: `"${room.id}"`,
                                value: room.id
                            }
                        ]
                    },
                    {
                        "type": "variable",
                        "variant": "va",
                        "name": "va00"
                    }
                ]
            }
        ]
    }
    const rooms = metaroom.rooms
    for (const permKey in metaroom.perms) {
        let perm = metaroom.perms[permKey];
        if (!permIsValid(rooms, perm)) {
            continue;
        }
        newTree.push({
            "type": "command",
            "variant": "door",
            "name": "door",
            "arguments": [
                {
                    "type": "returning-command",
                    "variant": "game",
                    "name": "game",
                    "arguments": [
                        {
                            "type": "literal",
                            "variant": "string",
                            name: `"${perm.rooms.a}"`,
                            value: perm.rooms.a
                        }
                    ]
                },
                {
                    "type": "returning-command",
                    "variant": "game",
                    "name": "game",
                    "arguments": [
                        {
                            "type": "literal",
                            "variant": "string",
                            name: `"${perm.rooms.b}"`,
                            value: perm.rooms.b
                        }
                    ]
                },
                {
                    "type": "literal",
                    "variant": "integer",
                    name: `${perm.permeability}`,
                    value: perm.permeability
                }
            ]
        });
    }
    for (const roomKey in metaroom.rooms) {
        let room = metaroom.rooms[roomKey];
        newTree.push({
            "type": "command",
            "variant": "delg",
            "name": "delg",
            "arguments": [
                {
                    "type": "literal",
                    "variant": "string",
                    name: `"${room.id}"`,
                    value: room.id
                }
            ]
        });
    }
    
    return TreeToText(newTree, true);
}


/**
 * Checks if a Perm object's rooms are still touching.
 * @param { {[id:string]: Room } } rooms
 * @param {Perm} perm
 * @returns {boolean}
 */
function permIsValid(rooms: { [id: string]: Room; }, perm: Perm) {
    const {a: roomId, b: otherRoomId} = perm.rooms;
    if (!rooms.hasOwnProperty(roomId) || !rooms.hasOwnProperty(otherRoomId)) {
        return false;
    }
    const room = rooms[roomId];
    const otherRoom = rooms[otherRoomId];
    const doorPotential = getDoorPotentialBetweenRooms(room, otherRoom);
    for (const potential of doorPotential) {
        if (potential.roomKeys.length !== 2) {
            continue;
        }
        const x = potential.end.x - potential.start.x;
        const y = potential.end.y - potential.start.y;
        const distance = Math.sqrt((x * x) + (y * y));
        if (distance > 8) {
            return true;
        }
    }
    return false;
}


module.exports = {
    parseCaosForMetaroom,
    parseMetaroomToCaos
}
