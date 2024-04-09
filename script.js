// Define the current song audio element and other variables
const currentSong = new Audio();
const play = document.querySelector("#play");
const pause = document.querySelector("#pause");
let playlists;
let songs;
let currentFolder;

// Function to convert seconds to minutes:seconds format
function secondsToMinutesSeconds(seconds) {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00";
    }

    // Round the seconds to the nearest integer to exclude milliseconds
    seconds = Math.round(seconds);

    let minutes = Math.floor(seconds / 60);
    let remainingSeconds = seconds % 60;

    minutes = String(minutes).padStart(2, '0');
    remainingSeconds = String(remainingSeconds).padStart(2, '0');

    return `${minutes}:${remainingSeconds}`;
}

// Function to fetch playlists
async function getPlaylists() {
    try {
        let p = await fetch("songs/");
        let responsePlaylist = await p.text();
        let divPlaylist = document.createElement("div");
        divPlaylist.innerHTML = responsePlaylist;
        let aPlaylist = divPlaylist.getElementsByTagName("a");
        let playlistContainer = document.querySelector(".card-container");
        playlists = [];
        for (let index = 0; index < aPlaylist.length; index++) {
            const element = aPlaylist[index];
            if (element.href.includes("/songs/")) {
                let folder = element.href.split("/songs/")[1];
                playlistContainer.innerHTML += createPlaylistCard(folder);
                playlists.push(folder);
            }
        }
        console.log(playlists);
    } catch (error) {
        console.error("Error fetching playlists:", error);
    }
}

// Function to create playlist cards
function createPlaylistCard(folder) {
    return `<div class="card">
                <img src="/songs/${folder}/cover.jpg">
                <button class="card-play-button">
                    <img src="Images/card-play.svg">
                </button>
                <h2>${decodeURIComponent(folder.replace(/%20/g, " "))}</h2>
            </div>`;
}

// Define a variable to track if songs are loaded
let songsLoaded = false;

// Function to fetch songs for a given folder
async function getSongs(folder) {
    currentFolder = folder;
    try {
        let a = await fetch(`songs/${folder}/`);
        let response = await a.text();
        let div = document.createElement("div");
        div.innerHTML = response;
        let as = div.getElementsByTagName("a");
        let songs = [];
        for (let index = 0; index < as.length; index++) {
            const element = as[index];
            if (element.href.endsWith(".mp3")) {
                const decodedFilename = decodeURIComponent(element.href.split(`/songs/${folder}/`)[1]);
                songs.push(decodedFilename);
            }
        }

        let songUl = document.querySelector(".songlist").getElementsByTagName("ul")[0];
        if (songs.length === 0) {
            songUl.innerHTML = "<li>Playlist empty</li>";
            document.querySelector(".current-song-info").innerHTML = "No Song";
            currentSong.pause();
            play.classList.remove("hide");
            pause.classList.add("hide");
            play.disabled = true;
            next.disabled = true;
            previous.disabled = true;

            document.querySelector(".circle").style.left = "0%";
            // Reset the stored seek bar position
            localStorage.removeItem('seekBarPosition');
        } else {
            songUl.innerHTML = "";
            songs.forEach(song => {
                songUl.innerHTML += `<li>
                    <img src="Images/song-image.svg">
                    <div class="song-info">
                        <div>${song}</div>
                        <div>Artist</div>
                    </div>
                    <img src="Images/playbar-play.svg">
                </li>`;
            });
        }

        // Set songsLoaded to true after songs are fetched
        songsLoaded = true;

        console.log("Songs:", songs);

        // Add event listeners to the list items
        Array.from(songUl.getElementsByTagName("li")).forEach(li => {
            li.addEventListener("click", () => {
                playMusic(li.querySelector(".song-info > div").innerText.trim());
            });
        });

        return songs; // Return the songs array
    } catch (error) {
        console.error("Error fetching songs:", error);
    }
}

let currentSongIndex = 0;

// Previous button functionality
document.getElementById("previous").addEventListener("click", () => {
    if (songs && songs.length > 0) {
        currentSongIndex--;
        if (currentSongIndex < 0) {
            currentSongIndex = songs.length - 1;
        }
        playMusic(songs[currentSongIndex]);
    }
});

// Next button functionality
document.getElementById("next").addEventListener("click", () => {
    if (songs && songs.length > 0) {
        currentSongIndex++;
        if (currentSongIndex >= songs.length) {
            currentSongIndex = 0;
        }
        playMusic(songs[currentSongIndex]);
    }
});


let lastPausedPosition = 0;

// Function to play a music track
const playMusic = (track, startTime = 0) => {
    currentSong.src = `/songs/${currentFolder}/` + track;

    // Set the current time of the audio to the specified start time
    currentSong.currentTime = startTime;

    // Play the audio
    currentSong.play()
        .then(() => {
            play.classList.add("hide");
            pause.classList.remove("hide");
        })
        .catch(error => {
            console.error('Error playing track:', error);
        });

    // Update the UI with the current song information
    document.querySelector(".current-song-info").innerHTML = decodeURI(track);
    document.querySelector(".song-duration").innerHTML = "00:00 / 00:00";
};

// Main function
async function main() {
    await getPlaylists();

    // Add event listeners to playlist cards
    Array.from(document.getElementsByClassName("card")).forEach(card => {
        const playButton = card.querySelector(".card-play-button");
        playButton.addEventListener("click", async () => {
            const playlistTitle = card.querySelector("h2").innerHTML;
            songs = await getSongs(playlistTitle);
            if (songs && songs.length > 0) {
                playMusic(songs[0]);
            }
        });
    });

    // Event listener for play button
    play.addEventListener("click", () => {
        if (songs && songs.length > 0) {
            // Check if there's a saved playback position
            const playbackPosition = localStorage.getItem('playbackPosition');
            if (playbackPosition !== null) {
                // Start playing from the saved playback position
                currentSong.currentTime = parseFloat(playbackPosition);
            }

            // Play the audio
            currentSong.play()
                .then(() => {
                    play.classList.add("hide");
                    pause.classList.remove("hide");
                })
                .catch(error => {
                    console.error('Error playing track:', error);
                });
        }
    });

    // Event listener for pause button
    pause.addEventListener("click", () => {
        // Pause the audio
        currentSong.pause();
        // Save the current playback position
        localStorage.setItem('playbackPosition', currentSong.currentTime);
        play.classList.remove("hide");
        pause.classList.add("hide");
    });

    // Event listener for seek bar
    document.querySelector(".seek-bar").addEventListener("click", e => {
        const seekBar = e.target;
        const percent = (e.offsetX / seekBar.getBoundingClientRect().width) * 100;
        const currentTime = (currentSong.duration * percent) / 100;

        // Update the UI with the clicked position
        document.querySelector(".circle").style.left = percent + "%";

        // Update the current playback time
        currentSong.currentTime = currentTime;
    });

    // Event listener for time update
    currentSong.addEventListener("timeupdate", () => {
        const currentTimeDisplay = document.querySelector(".song-duration");
        const circle = document.querySelector(".circle");

        const currentTime = secondsToMinutesSeconds(currentSong.currentTime);
        const duration = secondsToMinutesSeconds(currentSong.duration);

        currentTimeDisplay.innerHTML = `${currentTime} / ${duration}`;
        circle.style.left = (currentSong.currentTime / currentSong.duration) * 100 + "%";

        if (Math.abs(currentSong.currentTime - currentSong.duration) < 0.1) {
            play.classList.remove("hide");
            pause.classList.add("hide");

            setTimeout(() => {
                const index = songs.indexOf(currentSong.src.split('/').slice(-1)[0]);
                if ((index + 1) < songs.length) {
                    playMusic(songs[index + 1]);
                }
            }, 1000);
        }
    });

    // Event listener for volume seek bar
    document.querySelector(".volume").getElementsByTagName("input")[0].addEventListener("input", (e) => {
        currentSong.volume = parseInt(e.target.value) / 100;
    });

    // Event listener for menu button
    document.querySelector(".menu").addEventListener("click", () => {
        document.querySelector(".left").style.left = "0";
    });

    // Event listener for close button
    document.querySelector(".close").addEventListener("click", () => {
        document.querySelector(".left").style.left = "-100%";
    });

}

// Call the main function to start the application
main();
