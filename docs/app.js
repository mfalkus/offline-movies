function getParamsFromHash() {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.slice(1));  // Remove '#' and parse the parameters

    const googleSheetId = params.get('sheetId');  // Extract the 'sheetId' parameter
    const omdbApiKey = params.get('apikey');      // Extract the 'apikey' parameter

    return { googleSheetId, omdbApiKey };
}

function getRottenTomatoesRating(data) {
  const ratings = data.Ratings;
  if (!ratings || !Array.isArray(ratings)) {
      return null;
  }

  const rottenTomatoesRating = ratings.find(rating => rating.Source === "Rotten Tomatoes");
  return rottenTomatoesRating ? rottenTomatoesRating.Value : null;
}

// Example usage
const { googleSheetId, omdbApiKey } = getParamsFromHash();

if (!googleSheetId) {
    document.getElementById('error').innerHTML = 'No google sheet ID given in URL, expected form: https://example.com/#sheetId=GOOGLE_SHEET_ID&apikey=OMDB_API_KEY';
}
if (!omdbApiKey) {
    document.getElementById('error').innerHTML = 'No OMDB API Key given in URL, expected form: https://example.com/#sheetId=GOOGLE_SHEET_ID&apikey=OMDB_API_KEY';
}

// Build our config from the URL
const config = {
    googleSheetUrl: 'https://docs.google.com/spreadsheets/d/e/' + googleSheetId + '/pub?gid=0&single=true&output=csv',
    omdbApiKey: omdbApiKey,
}


let movieCache = JSON.parse(localStorage.getItem('movieCache')) || {};
let films = [];
let uniqueTags = {};

// Fetch film data from Google Sheet and extract only the first column for film name and fourth for tags
async function fetchFilms() {
  const response = await fetch(config.googleSheetUrl);
  const text = await response.text();

  const rows = text.split('\n').map(row => row.trim());
  rows.shift(); // Remove header

  // Map film names and tags from CSV
  const films = rows.map(row => {
    const columns = row.split(',');
    const filmName = columns[0];
    const filmYear = columns[1];
    const filmMedia = columns[2] ? columns[2] : 'DVD';
    const tags = columns[3] ? columns[3].split('; ') : []; // Assuming tags are separated by semicolons

    const notes = columns[4];
    return { name: filmName, year: filmYear, media: filmMedia, notes: notes, tags };
  });

  return films;
}

// Fetch full movie info using OMDb API, check cache first
async function fetchMovieInfo(filmName, filmYear) {
  let cacheName = filmName + (filmYear ? filmYear : '');
  if (movieCache[cacheName]) {
    return movieCache[cacheName];
  }

  let yearStr = '';
  if (filmYear) {
    yearStr = `&y=${encodeURIComponent(filmYear)}`;
  }

  const response = await fetch(`https://www.omdbapi.com/?t=${encodeURIComponent(filmName)}${yearStr}&apikey=${config.omdbApiKey}`);
  const data = await response.json();

  if (data.Response === 'True') {
    movieCache[filmName] = data;
    localStorage.setItem('movieCache', JSON.stringify(movieCache));
    return data;
  }

  return { Title: filmName, Poster: 'https://via.placeholder.com/200x300?text=No+Poster+Available', Plot: 'No information available', Year: 'Unknown' };
}

// Function to sort movies, moving 'unwatched' to the front
function sortMoviesByTag(movies) {
  return movies.sort((a, b) => {
    const aHasUnwatched = a.tags.includes('Unwatched');
    const bHasUnwatched = b.tags.includes('Unwatched');

    // If a has 'unwatched' and b does not, a comes first
    if (aHasUnwatched && !bHasUnwatched) return -1;
    // If b has 'unwatched' and a does not, b comes first
    if (!aHasUnwatched && bHasUnwatched) return 1;
    // Otherwise, keep original order
    return 0;
  });
}

// Display films as images with tags on them
async function displayFilms(films) {
  const filmGrid = document.getElementById('filmGrid');
  filmGrid.innerHTML = '';

  let sortedFilms = sortMoviesByTag(films);
  document.getElementById('count').textContent = sortedFilms.length;

  for (const film of sortedFilms) {
    const movie = await fetchMovieInfo(film.name, film.year);
    const filmItem = document.createElement('div');
    const tagClasses = film.tags.map(tag => `tag--${tag.toLowerCase()}`);
    filmItem.className = 'filmItem';
    filmItem.innerHTML = `
      <img class="filmPoster ${tagClasses.join(' ')}" src="${movie.Poster}" alt="${movie.Title}" data-filmname="${film.name}" data-filmyear="${film.year}">
      <div class="tags">
        ${film.tags.map(tag => `<span onClick="window.setFilter('${tag}')" class="tag span-tag" data-tag="${tag}" style="background-color: ${getTagColor(tag)}">${tag}</span>`).join('')}
       </div>
    `;
    filmGrid.appendChild(filmItem);
  }

  // Add click event to each film poster to open the modal
  document.querySelectorAll('.filmPoster').forEach(poster => {
    poster.addEventListener('click', function () {
      showFilmModal(this.getAttribute('data-filmname'), this.getAttribute('data-filmyear'));
    });
  });
}

// Show modal with movie info
async function showFilmModal(filmName, filmYear) {
  const movie = await fetchMovieInfo(filmName, filmYear);

  document.getElementById('modalPoster').src = movie.Poster;
  document.getElementById('modalTitle').textContent = movie.Title;
  document.getElementById('modalPlot').textContent = movie.Plot;
  document.getElementById('modalYear').textContent = movie.Year;
  document.getElementById('modalGenre').textContent = movie.Genre;
  document.getElementById('modalRated').textContent = movie.Rated;
  document.getElementById('modalRuntime').textContent = movie.Runtime;

  document.getElementById('modalTrailer').href = `https://www.youtube.com/results?search_query=${encodeURIComponent(movie.Title)}+trailer`;

  const rtRating = getRottenTomatoesRating(movie);
  document.getElementById('modalRTRating').textContent = rtRating ? rtRating : 'Unavailable';

  let localFilm = films.find(film => film.name === filmName && film.year === filmYear);
  if (localFilm) {
      document.getElementById('modalTags').textContent = localFilm.tags.join(', ');
      document.getElementById('modalMedia').textContent = localFilm.media;
      document.getElementById('modalNotes').textContent = localFilm.notes;
  } else {
      document.getElementById('modalTags').textContent = '';
      document.getElementById('modalMedia').textContent = '';
      document.getElementById('modalNotes').textContent = '';
  }

  document.getElementById('filmModal').style.display = 'block';
}

// Function to generate a consistent color based on the tag string
// Thanks ChatGPT!
function getTagColor(tag) {
  if (!uniqueTags[tag]) {
    // Generate a hash from the tag string
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);  // Create a hash from the string
    }

    // Convert the hash into a hex color code
    const color = `#${((hash >> 0) & 0xFFFFFF).toString(16).padStart(6, '0')}`;

    uniqueTags[tag] = color;  // Store the color for future use
  }
  return uniqueTags[tag];
}

// Close the modal
// or close the modal if user clicks outside of it
const modal = document.getElementById('filmModal');
document.querySelector('.close').onclick = () => {
  modal.style.display = 'none';
};
window.onclick = (event) => {
  if (event.target == modal) {
    modal.style.display = 'none';
  }
};

window.setFilter = function(val) {
  document.getElementById('search').value = val;
  filterFilms();
  console.log(`Filtered to ${val}`);
}

// Filter films based on search input
function filterFilms(val) {
  const searchValue = document.getElementById('search').value;
  const filteredFilms = films.filter(
      film => film.name.toLowerCase().includes(searchValue.toLowerCase())
            || film.tags.includes(searchValue)
  );

  displayFilms(filteredFilms);
}

document.getElementById('search').onchange = filterFilms;

document.getElementById('reset').onclick = function() {
  window.setFilter('');
}

// Fetch and display films on page load
async function init() {
  films = await fetchFilms();
  displayFilms(films);
}

init();
