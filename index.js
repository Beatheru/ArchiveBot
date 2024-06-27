const { Client, GatewayIntentBits, EmbedBuilder } = require("discord.js");
const {
    createAudioPlayer,
    createAudioResource,
    joinVoiceChannel,
    NoSubscriberBehavior,
    AudioPlayerStatus,
    getVoiceConnection,
    VoiceConnectionStatus
} = require("@discordjs/voice");
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { findBestMatch } = require("string-similarity");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
    ],
});

const types = [".mp3", ".mp4", ".webm", ".swf"];
let player = createAudioPlayer();
let connection = null;
let queue = [];
let once = true;
let newConnection = false;

player.on(AudioPlayerStatus.Idle, async () => {
    queue.shift();
    await new Promise((r) => setTimeout(r, 1000));
    //console.log(queue);

    if (queue.length > 0) {
        player.play(queue[0].resource);
    } else {
        connection.destroy();
        //console.log(connection)
        //connection = null;
    }
});

player.on(AudioPlayerStatus.Playing, async () => {
    if (once) {
        console.log("Playing: " + queue[0].name);
        once = false;
    } else {
        once = true;
    }
});

client.on("messageCreate", async (message) => {
    
        let split = message.content.split(/\s+/);
        let command = split[0];
        let args = split.slice(1).join(" ");

        //console.log("Command: " + command);
        //console.log("Args: " + args);

        if (command.startsWith(process.env.PREFIX)) {
            message.delete();
            if (command.substring(1).toLowerCase() === "clip") {
                if (!message.member.voice?.channel)
                    return message.channel.send("Connect to a Voice Channel");

                if (!connection || connection._state.status == VoiceConnectionStatus.Destroyed) {
                    connection = joinVoiceChannel({
                        channelId: message.member.voice.channel.id,
                        guildId: message.guild.id,
                        adapterCreator: message.guild.voiceAdapterCreator,
                        selfDeaf: false,
                    });
                    newConnection = true;
                }

                let clip = null;
                let files = [];
                let paths = [];
                const getFilesRecursively = (directory) => {
                    const filesInDirectory = fs.readdirSync(directory);
                    for (const file of filesInDirectory) {
                        const absolute = path.join(directory, file);
                        if (fs.statSync(absolute).isDirectory()) {
                            getFilesRecursively(absolute);
                        } else {
                            files.push(file);
                            paths.push(absolute)
                        }
                    }
                };

                getFilesRecursively("./clips");

                clip = findBestMatch(args, files).bestMatch.target;
                if (!clip) return;

                const resource = createAudioResource(paths[files.indexOf(clip)]);
                queue.push({
                    name: clip,
                    resource: resource,
                });

                console.log("Queued: " + clip);

                if (player.state.status == AudioPlayerStatus.Idle || newConnection) {
                    player.play(resource);
                    connection.subscribe(player);
                }
            } else if (command.substring(1).toLowerCase() === "skip") {
                player.stop();
                queue.shift();
                await new Promise((r) => setTimeout(r, 1000));
                //console.log(queue);

                if (queue.length > 0) {
                    player.play(queue[0].resource);
                } else {
                    connection.destroy();
                    //connection = null;
                }
            } else if (command.substring(1).toLowerCase() === "stop") {
                player.stop();
                queue = []
                connection.destroy();
                //connection = null;
            } else if (command.substring(1).toLowerCase() === "queue") {
                let embed = new EmbedBuilder();
                embed.addFields({ name: 'Inline field title', value: 'Some value here', inline: true })
                //channel.send({ embeds: [embed] });
            }
        }
    
});

client.login(process.env.TOKEN);
client.once("ready", () => {
    console.log("Ready!");
});
