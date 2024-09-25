import config from './config.js';

// Cache for storing fetched movie data (using localStorage)
let movieCache = JSON.parse(localStorage.getItem('movieCache')) || {};

// Fetch film data from Google Sheet and extract only the first column
async function fetchFilms() {
  const response = await fetch(config.googleSheetUrl);
  const text = await response.text();
  
  // Split CSV into rows
  const rows = text.split('\n').map(row => row.trim());
  
  // Remove header (first row)
  rows.shift();

  // Extract only the movie name from the first column (up to the first comma)
  const films = rows.map(row => row.split(',')[0]);

  return films;
}

// Fetch full movie info using OMDb API, check cache first
async function fetchMovieInfo(filmName) {
  // Check if the movie is already in the cache
  if (movieCache[filmName]) {
    console.log(`Cache hit for: ${filmName}`);
    return movieCache[filmName];
  }

  // Fetch movie details from OMDb API
  const response = await fetch(`http://www.omdbapi.com/?t=${encodeURIComponent(filmName)}&apikey=${config.omdbApiKey}`);
  const data = await response.json();

  // If data is valid, cache it (store the entire movie object)
  if (data.Response === 'True') {
    movieCache[filmName] = data;

    // Save the updated cache to localStorage
    localStorage.setItem('movieCache', JSON.stringify(movieCache));

    return data;
  }

  // Return a fallback object if the movie was not found
  return {
    Title: filmName,
    Poster: 'https://via.placeholder.com/200x300?text=No+Poster+Available',
    Plot: 'No information available',
    Year: 'Unknown'
  };
}

// Display films in a grid
async function displayFilms(films) {
  const filmGrid = document.getElementById('filmGrid');
  filmGrid.innerHTML = '';

  for (const film of films) {
    const movie = await fetchMovieInfo(film);

    const filmItem = document.createElement('div');
    filmItem.className = 'filmItem';
    filmItem.innerHTML = `
      <img class="filmPoster" src="${movie.Poster}" alt="${movie.Title}">
      <p><strong>${movie.Title}</strong> (${movie.Year})</p>
      <p>${movie.Plot}</p>
    `;

    filmGrid.appendChild(filmItem);
  }
}

// Filter films based on search input
function filterFilms() {
  const searchValue = document.getElementById('search').value.toLowerCase();

  const filteredFilms = films.filter(film => film.toLowerCase().includes(searchValue));
  displayFilms(filteredFilms);
}

// Fetch and display films on page load
let films = [];
async function init() {
  films = await fetchFilms();
  displayFilms(films);
}

init();

