import config from './config.js';

let movieCache = JSON.parse(localStorage.getItem('movieCache')) || {};
let films = [];
let uniqueTags = {};

// Load config.json dynamically
async function loadConfig() {
  const response = await fetch('config.json');
  config = await response.json();
}

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
    const tags = columns[3] ? columns[3].split(';') : []; // Assuming tags are separated by semicolons
    return { name: filmName, year: filmYear, media: filmMedia, tags };
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

  const response = await fetch(`http://www.omdbapi.com/?t=${encodeURIComponent(filmName)}${yearStr}&apikey=${config.omdbApiKey}`);
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

  for (const film of sortedFilms) {
    const movie = await fetchMovieInfo(film.name, film.year);
    const filmItem = document.createElement('div');
    const tagClasses = film.tags.map(tag => `tag--${tag.toLowerCase()}`);
    filmItem.className = 'filmItem';
    filmItem.innerHTML = `
      <img class="filmPoster ${tagClasses}" src="${movie.Poster}" alt="${movie.Title}" data-filmname="${film.name}" data-filmyear="${film.year}">
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
  document.getElementById('modalTags').textContent = films.find(film => film.name === filmName).tags.join(', ');

  document.getElementById('filmModal').style.display = 'block';
}

// Get color for unique tags
function getTagColor(tag) {
  if (!uniqueTags[tag]) {
    uniqueTags[tag] = `#${Math.floor(Math.random()*16777215).toString(16)}`; // Assign random color
  }
  return uniqueTags[tag];
}

// Close the modal
const modal = document.getElementById('filmModal');
document.querySelector('.close').onclick = () => {
  modal.style.display = 'none';
};

// Close the modal if user clicks outside of it
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

// Fetch and display films on page load
async function init() {
  films = await fetchFilms();
  displayFilms(films);
}

init();
