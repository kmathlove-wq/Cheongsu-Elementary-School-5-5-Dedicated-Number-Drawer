const songRequestOverlay =
  document.getElementById('songRequestOverlay');

const songRequestForm =
  document.getElementById('songRequestForm');

const songRequestTitle =
  document.getElementById('songRequestTitle');

const songRequestInput =
  document.getElementById('songRequestInput');

const songRequestError =
  document.getElementById('songRequestError');

const songCandidateList =
  document.getElementById('songCandidateList');

const songSearchAllButton =
  document.getElementById('songSearchAllButton');

const songRequestSkipButton =
  document.getElementById('songRequestSkipButton');

const youtubePlayer =
  document.getElementById('youtubePlayer');

const youtubePlayerTitle =
  document.getElementById('youtubePlayerTitle');

const youtubePlayerFrame =
  document.getElementById('youtubePlayerFrame');

const YOUTUBE_SEARCH_FETCH_LIMIT = 20;
const YOUTUBE_VISIBLE_CANDIDATE_LIMIT = 10;
const MAX_VIDEO_AGE_YEARS = 8;

// 배포 시 GitHub Actions Secret YOUTUBE_API_KEY로 대체됩니다.
const YOUTUBE_API_KEY = '__YOUTUBE_API_KEY__';

function parseYouTubeDuration(duration) {

  const match =
    duration.match(
      /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/
    );

  if (!match) return 0;

  const hours = Number(match[1] || 0);
  const minutes = Number(match[2] || 0);
  const seconds = Number(match[3] || 0);

  return hours * 3600 + minutes * 60 + seconds;
}

function normalizeSongText(text) {

  return String(text)
    .toLowerCase()
    .replace(/[()[\]{}'"“”‘’]/g, ' ')
    .replace(/[^0-9a-z가-힣\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactSongText(text) {

  return normalizeSongText(text).replace(/\s+/g, '');
}

function hasKoreanText(text) {

  return /[가-힣]/.test(String(text));
}

const SONG_TITLE_ALIASES = {
  '버터플라이': ['butterfly'],
  '뱅뱅': ['bang bang', 'bangbang'],
};

function getSongTitleQueries(songName) {

  const queries = [songName];
  const compactSong = compactSongText(songName);

  Object.entries(SONG_TITLE_ALIASES).forEach(([keyword, aliases]) => {
    if (compactSong.includes(compactSongText(keyword))) {
      queries.push(...aliases);
    }
  });

  return queries;
}

function getTextSimilarity(a, b) {

  const source = normalizeSongText(a);
  const target = normalizeSongText(b);
  const compactSource = compactSongText(a);
  const compactTarget = compactSongText(b);

  if (!source || !target) return 0;

  if (target === source ||
      compactTarget === compactSource) return 1;

  if (compactTarget.includes(compactSource)) {
    return Math.min(
      1,
      0.65 +
      compactSource.length / compactTarget.length * 0.25
    );
  }

  const sourceTokens = source.split(' ');
  const targetTokenList = target.split(' ');
  const targetTokens = new Set(targetTokenList);
  const hits =
    sourceTokens.filter((token) => targetTokens.has(token)).length;
  const coverage = hits / sourceTokens.length;

  if (coverage === 0) return 0;

  const lengthRatio =
    Math.min(source.length, target.length) /
    Math.max(source.length, target.length);
  const tokenRatio =
    Math.min(sourceTokens.length, targetTokenList.length) /
    Math.max(sourceTokens.length, targetTokenList.length);
  const phraseBonus =
    target.includes(source) ||
    compactTarget.includes(compactSource)
      ? 0.2
      : 0;

  return Math.min(
    1,
    coverage * 0.5 +
    lengthRatio * 0.3 +
    tokenRatio * 0.2 +
    phraseBonus
  );
}

function getBestTitleSimilarity(songName, title) {

  return Math.max(
    ...getSongTitleQueries(songName)
      .map((query) => getTextSimilarity(query, title))
  );
}

function isTooOldSongVideo(video) {

  const publishedAt = video.snippet?.publishedAt;

  if (!publishedAt) return false;

  const publishedTime = new Date(publishedAt).getTime();

  if (!Number.isFinite(publishedTime)) return false;

  const maxAgeMs =
    MAX_VIDEO_AGE_YEARS * 365.25 * 24 * 60 * 60 * 1000;

  return Date.now() - publishedTime > maxAgeMs;
}

function isBlockedSongVideo(video) {

  const title =
    normalizeSongText(video.snippet?.title || '');
  const channel =
    normalizeSongText(video.snippet?.channelTitle || '');
  const description =
    normalizeSongText(video.snippet?.description || '');
  const text = `${title} ${channel} ${description}`;

  const schoolLike =
    /(초등학교|중학교|고등학교|학교|학년|반|수업|학예회|축제|졸업)/.test(text);
  const classVideoLike =
    /(뮤직비디오|music video|mv|m v)/.test(text);
  const longLoopLike =
    /(1시간|한시간|hour|hours|loop|반복|연속재생|playlist|모음)/.test(text);
  const shortsLike =
    /(#shorts|shorts|쇼츠|유튜브쇼츠|ytshorts)/.test(text);
  const translationLike =
    /(해석|번역|translation|translated)/.test(text);
  const varietyClipLike =
    /(놀면 뭐하니|예능|방영|방송분|full ver|풀버전|클립|clip)/.test(text);
  const nostalgiaClipLike =
    /(그 시절|선택받은 아이들|눈물|추억|90년생)/.test(text);

  return (schoolLike && classVideoLike) ||
    longLoopLike ||
    shortsLike ||
    translationLike ||
    varietyClipLike ||
    nostalgiaClipLike ||
    isTooOldSongVideo(video);
}

function scoreSongVideo(video, songName) {

  const title = video.snippet?.title || '';
  const channel = video.snippet?.channelTitle || '';
  const views = Number(video.statistics?.viewCount || 0);
  const similarity = getBestTitleSimilarity(songName, title);
  const normalizedSong = normalizeSongText(songName);
  const normalizedTitle = normalizeSongText(title);
  const compactSong = compactSongText(songName);
  const compactTitle = compactSongText(title);
  const exactTitleBonus =
    normalizedTitle === normalizedSong ||
    compactTitle === compactSong
      ? 140
      : 0;
  const phraseTitleBonus =
    normalizedTitle.includes(normalizedSong) ||
    compactTitle.includes(compactSong)
      ? 12
      : 0;
  const modifierPenalty =
    compactTitle !== compactSong &&
    /(전설의|괴담|퇴마사|공포|무서운|무서움|버전|cover|커버)/i.test(title)
      ? 45
      : 0;
  const officialBonus =
    /(official|topic|vevo|오피셜|공식)/i.test(channel) ? 12 : 0;

  return exactTitleBonus +
    phraseTitleBonus +
    similarity * 90 +
    Math.log10(Math.max(views, 1)) * 20 +
    officialBonus -
    modifierPenalty;
}

async function fetchYouTubeJson(url) {

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('YouTube API 요청에 실패했습니다.');
  }

  return response.json();
}

function sortSongCandidates(a, b, songName) {

  const viewDiff = b._views - a._views;

  if (viewDiff !== 0) return viewDiff;

  const scoreDiff =
    scoreSongVideo(b, songName) -
    scoreSongVideo(a, songName);

  if (scoreDiff !== 0) return scoreDiff;

  return a._searchRank - b._searchRank;
}

async function findYouTubeCandidates(songName) {

  if (!YOUTUBE_API_KEY ||
      YOUTUBE_API_KEY === '__YOUTUBE_API_KEY__') {
    throw new Error('YouTube API 키를 먼저 입력해 주세요.');
  }

  const params =
    new URLSearchParams({
      part: 'snippet',
      type: 'video',
      maxResults: String(YOUTUBE_SEARCH_FETCH_LIMIT),
      order: 'relevance',
      regionCode: 'KR',
      relevanceLanguage: 'ko',
      q: songName,
      key: YOUTUBE_API_KEY,
    });

  const searchData =
    await fetchYouTubeJson(
      `https://www.googleapis.com/youtube/v3/search?${params}`
    );

  const ids =
    (searchData.items || [])
      .map((item) => item.id?.videoId)
      .filter(Boolean);

  if (ids.length === 0) {
    throw new Error('검색 결과가 없습니다.');
  }

  const detailParams =
    new URLSearchParams({
      part: 'snippet,contentDetails,statistics',
      id: ids.join(','),
      key: YOUTUBE_API_KEY,
    });

  const detailData =
    await fetchYouTubeJson(
      `https://www.googleapis.com/youtube/v3/videos?${detailParams}`
    );
  const idRanks =
    new Map(ids.map((id, index) => [id, index]));

  const allCandidates =
    (detailData.items || [])
      .map((video) => ({
        ...video,
        _searchRank: idRanks.get(video.id) ?? 999,
        _seconds:
          parseYouTubeDuration(video.contentDetails?.duration || ''),
        _views: Number(video.statistics?.viewCount || 0),
        _similarity:
          getBestTitleSimilarity(songName, video.snippet?.title || ''),
        _hasKoreanText:
          hasKoreanText(
            `${video.snippet?.title || ''} ` +
            `${video.snippet?.channelTitle || ''} ` +
            `${video.snippet?.description || ''}`
          ),
      }))
      .filter((video) => !isTooOldSongVideo(video));

  const candidates =
    allCandidates
      .filter((video) =>
        video._views >= 100000 &&
        video._seconds >= 60 &&
        video._seconds <= 720 &&
        video._similarity >= 0.45 &&
        !isBlockedSongVideo(video)
      )
      .filter((video, index, videos) => {
        if (!hasKoreanText(songName)) return true;

        const koreanCandidates =
          videos.some((candidate) => candidate._hasKoreanText);

        return !koreanCandidates || video._hasKoreanText;
      })
      .sort((a, b) => sortSongCandidates(a, b, songName));

  return {
    recommended: candidates.slice(0, 2),
    all: allCandidates
      .sort((a, b) => a._searchRank - b._searchRank)
      .slice(0, YOUTUBE_VISIBLE_CANDIDATE_LIMIT),
  };
}

function playYouTubeVideo(video, songName) {

  const title = video.snippet?.title || songName;

  youtubePlayerTitle.textContent = title;

  youtubePlayerFrame.src =
    `https://www.youtube.com/embed/${video.id}` +
    '?autoplay=1&rel=0';

  youtubePlayer.hidden = false;
}

export function isYouTubePlayerOpen() {

  return !youtubePlayer.hidden;
}

function formatViewCount(views) {

  if (views >= 10000) {
    return `${Math.round(views / 10000)}만회`;
  }

  return `${views.toLocaleString('ko-KR')}회`;
}

function formatDuration(seconds) {

  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;

  return `${minutes}:${String(restSeconds).padStart(2, '0')}`;
}

function renderSongCandidates(videos, options = {}) {

  songCandidateList.innerHTML = '';

  videos.forEach((video, index) => {

    const button = document.createElement('button');
    const title = video.snippet?.title || '제목 없음';
    const channel = video.snippet?.channelTitle || '채널 정보 없음';
    const rankLabel =
      options.showRank
        ? `${index + 1}등`
        : `${index + 1}`;

    button.type = 'button';
    button.className = 'song-candidate';
    button.dataset.videoId = video.id;
    button.title = title;
    button.setAttribute(
      'aria-label',
      `${rankLabel}. ${title}`
    );

    const titleEl = document.createElement('strong');
    const metaEl = document.createElement('span');

    titleEl.textContent = `${rankLabel}. ${title}`;
    titleEl.title = title;
    metaEl.textContent =
      `${channel} · ${formatViewCount(video._views)} · ` +
      formatDuration(video._seconds);

    button.append(titleEl, metaEl);

    songCandidateList.appendChild(button);
  });
}

export function closeYouTubePlayer() {

  youtubePlayerFrame.src = '';
  youtubePlayer.hidden = true;
}

export function closeSongRequest() {

  songRequestOverlay.classList.remove('show');
  songRequestOverlay.setAttribute('aria-hidden', 'true');
}

export function isBlockingDialogOpen() {

  return songRequestOverlay.classList.contains('show');
}

export function requestSongForResult(
  selected,
  {
    getEntryItem,
    getResultLabel,
  }
) {

  return new Promise((resolve) => {

    const firstItem = getEntryItem(selected[0]);
    const studentLabel = getResultLabel(firstItem);

    songRequestTitle.textContent =
      `${studentLabel}이 듣고 싶은 노래를 입력하세요`;
    songRequestInput.value = '';
    songRequestError.textContent = '';
    songCandidateList.innerHTML = '';
    songSearchAllButton.hidden = true;
    songRequestOverlay.classList.add('show');
    songRequestOverlay.setAttribute('aria-hidden', 'false');
    let currentSongName = '';
    let recommendedVideos = [];
    let allVideos = [];

    const finish = () => {
      songRequestForm.removeEventListener('submit', onSubmit);
      songRequestSkipButton.removeEventListener('click', onSkip);
      songSearchAllButton.removeEventListener('click', onSearchAll);
      songCandidateList.removeEventListener('click', onPickCandidate);
      closeSongRequest();
      resolve();
    };

    const playSelectedVideo = (video) => {
      playYouTubeVideo(video, currentSongName);
      finish();
    };

    const onSubmit = async (event) => {

      event.preventDefault();

      const songName = songRequestInput.value.trim();

      if (!songName) {
        songRequestError.textContent = '노래 이름을 입력해 주세요.';
        return;
      }

      songRequestError.textContent = 'YouTube에서 찾는 중입니다...';
      songCandidateList.innerHTML = '';
      songSearchAllButton.hidden = true;

      try {
        const result = await findYouTubeCandidates(songName);

        currentSongName = songName;
        recommendedVideos = result.recommended;
        allVideos = result.all;

        renderSongCandidates(recommendedVideos, { showRank: true });
        songSearchAllButton.hidden = allVideos.length === 0;
        songRequestError.textContent =
          recommendedVideos.length > 0
            ? '재생할 노래를 선택해 주세요.'
            : allVideos.length > 0
              ? '조건에 맞는 추천 영상은 없지만 직접 찾을 수 있습니다.'
              : '조건에 맞는 YouTube 영상을 찾지 못했습니다.';
      } catch (error) {
        songRequestError.textContent = error.message;
      }
    };

    const onSearchAll = () => {
      if (allVideos.length === 0) return;

      renderSongCandidates(allVideos, { showRank: false });
      songRequestError.textContent =
        '후보 중 재생할 노래를 선택해 주세요.';
    };

    const onPickCandidate = (event) => {
      const button = event.target.closest('.song-candidate');

      if (!button) return;

      const videos =
        [...recommendedVideos, ...allVideos];
      const video =
        videos.find((item) => item.id === button.dataset.videoId);

      if (video) {
        playSelectedVideo(video);
      }
    };

    const onSkip = () => {
      finish();
    };

    songRequestForm.addEventListener('submit', onSubmit);
    songRequestSkipButton.addEventListener('click', onSkip);
    songSearchAllButton.addEventListener('click', onSearchAll);
    songCandidateList.addEventListener('click', onPickCandidate);

    setTimeout(() => songRequestInput.focus(), 0);
  });
}
