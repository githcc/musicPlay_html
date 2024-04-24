const categories = [...new Set(musics.map(song => song.replace("https://githcc.github.io/music_self_mp3/", "").split('/')[0]))];

// Get the category list container
const categoryList = document.querySelector('.category-list');

// Create and append the category buttons
categories.forEach(category => {
    const button = document.createElement('button');
    button.textContent = category;
    button.onclick = () => filterSongs(category);
    categoryList.appendChild(button);
});

filterSongs();
playAndShowLyrics(musicsNow[0]);
var musicPlayer = document.getElementById('music-player');
var blobUrl;

function playMusic() {
    if (musicPlayer.paused) {
        // 如果音乐是暂停状态,则开始播放
        musicPlayer.play();
    } else {
        // 如果音乐是播放状态,则暂停
        musicPlayer.pause();
    }
}

function filterSongs(category = '') {
    const shuffledMusics = shuffleArray(musics);
    if (detectDeviceType() === 'mobile') {
        musicsNow = shuffledMusics.filter(song => song.includes(`/${category}/`)).slice(0, 2);
    } else {
        musicsNow = shuffledMusics.filter(song => song.includes(`/${category}/`)).slice(0, 4);
    }
    updateSongList();
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function updateSongList() {
    const songList = document.querySelector('.song-list');
    songList.innerHTML = '';

    musicsNow.forEach((song, index) => {
        const songName = song.split('/').pop().replace('.opus', '');
        const button = document.createElement('button');
        button.textContent = songName;
        button.onclick = () => playSong(index);
        songList.appendChild(button);
    });
}

function playSong(index) {
    // player.src = musicsNow[index];
    // player.play();
    playAndShowLyrics(musicsNow[index]);
}


// 解析歌词文件
function parseLyricsFile(lyricsText) {
    const lyrics = [];
    const lines = lyricsText.split('\n');
    const regex = /\[(\d{2}):(\d{2})\.(\d{2})\](.*)/;

    for (const line of lines) {
        const match = line.match(regex);
        if (match) {
            const [, minutes, seconds, milliseconds, text] = match;
            const timestamp = parseInt(minutes) * 60000 + parseInt(seconds) * 1000 + parseInt(milliseconds) * 10;
            lyrics.push({timestamp, text});
        }
    }

    return lyrics;
}

// 更新歌词显示
function updateLyrics(currentTimestamp, lyrics, visibleLyrics = 4) {
    let currentIndex = 0;
    while (currentIndex < lyrics.length && currentTimestamp >= lyrics[currentIndex].timestamp) {
        currentIndex++;
    }

    const startIndex = Math.max(0, currentIndex - visibleLyrics);
    const endIndex = Math.min(lyrics.length, currentIndex + visibleLyrics + 1);

    const lyricsDiv = document.getElementById('lyrics');
    lyricsDiv.innerHTML = '';

    for (let i = startIndex; i < endIndex; i++) {
        const lyricElement = document.createElement('p');
        lyricElement.textContent = lyrics[i].text;
        lyricElement.classList.toggle('current', i === currentIndex - 1);
        lyricsDiv.appendChild(lyricElement);
    }

    // 滚动歌词
    if (currentIndex >= visibleLyrics && currentIndex < lyrics.length - visibleLyrics) {
        lyricsDiv.scrollTop = (currentIndex - visibleLyrics) * 22; // 24 是每行歌词的高度
    } else if (currentIndex < visibleLyrics) {
        lyricsDiv.scrollTop = 0;
    } else {
        lyricsDiv.scrollTop = (lyrics.length - 2 * visibleLyrics) * 22;
    }
}

function playAndShowLyrics(name) {
    if (musicPlayer && typeof updateLyrics === 'function') {
        musicPlayer.removeEventListener('timeupdate', updateLyrics);
    }
    // 获取 MP3 文件的元数据 //name
    fetch(name)
        .then(response => response.arrayBuffer())
        .then(buffer => {
            // 将 ArrayBuffer 转换为 Blob
            const blob = new Blob([buffer], {type: 'audio/mpeg'});
            blobUrl = URL.createObjectURL(blob);

            musicPlayer.src = blobUrl;

            // 使用 jsmediatags 库解析 MP3 文件元数据
            jsmediatags.read(blob, {
                onSuccess: async tag => {

                    // 将元数据显示在页面上
                    document.getElementById('title').textContent = tag.tags.title || 'N/A';
                    document.getElementById('artist').textContent = tag.tags.artist || 'N/A';
                    document.getElementById('album').textContent = tag.tags.album || 'N/A';
                    document.getElementById('year').textContent = tag.tags.year || 'N/A';

                    // 获取专辑图片并显示

                    if (tag.tags.picture) {
                        const albumCover = document.getElementById('album-cover');
                        const picture = tag.tags.picture;
                        try {
                            let base64String;
                            try {
                                base64String = btoa(Array.from(picture.data, byte => String.fromCharCode(byte)).join(''));
                            } catch (e) {
                                console.error('Error converting image data to base64:', e);
                                base64String = '';
                            }
                            albumCover.src = `data:${picture.format};base64,${base64String}`;
                        }catch (e) {
                            albumCover.src = 'img/default-image.png';
                        }
                    }
                    if (musicPlayer.paused) {
                        // 如果音乐是暂停状态,则开始播放
                        musicPlayer.play();
                    }
                },
                onError: error => {
                    console.error('Error parsing MP3 metadata:', error);
                }
            });
        })
        .catch(error => {
            console.error('Error fetching MP3 file:', error);
        });
    // 读取歌词文件
    fetch(name.replace('.mp3', '.lrc'))
        .then(response => {
            if (response.ok) {
                return response.text();
            } else {
                throw new Error('Lyrics file not found');
            }
        })
        .then(lyrics => {
            // Parse the lyrics and store them
            const lyricsData = parseLyricsFile(lyrics);

            // Set the music player's source
            musicPlayer.src = blobUrl;

            // Listen for the music player's timeupdate event and update the lyrics display
            musicPlayer.addEventListener('timeupdate', () => {
                if (detectDeviceType() === 'mobile') {
                    updateLyrics(musicPlayer.currentTime * 1000, lyricsData, 3);
                } else {
                    updateLyrics(musicPlayer.currentTime * 1000, lyricsData);
                }
            });
        })
        .catch(error => {
            console.error('Error fetching lyrics file:', error);
            // Display a "No Lyrics Available" message
            const lyricDisplay = document.getElementById('lyrics-display');
            lyricDisplay.textContent = 'No Lyrics Available';
        });
}


function detectDeviceType() {
    let deviceType;
    // 检查是否为移动设备
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        deviceType = 'mobile';
    } else {
        deviceType = 'desktop';
    }
    return deviceType;
}