import { useEffect, useRef, useState } from 'react';
import StarRating from './StarRating';
import { useMovies } from './useMovies';
import { useLocalStorageState } from './useLocalStorageState';
import { useKey } from './useKey';

const average = (arr) => Number.parseFloat(arr.reduce((acc, cur, i, arr) => acc + cur / arr.length, 0)).toFixed(2);

const apiKey = '';

export default function App() {
  const [query, setQuery] = useState('');
  const [watched, setWatched] = useLocalStorageState([], 'watched');
  const [selectedId, setSelectedId] = useState(null);
  const { movies, isLoading, error } = useMovies(query);

  function handleSelectMovie(id) {
    setSelectedId((selectedId) => (selectedId === id ? null : id));
  }

  function handleCloseMovie() {
    setSelectedId(null);
  }

  function handleAddWatch(movie) {
    setWatched((watched) => [...watched, movie]);

    // localStorage.setItem('watched', JSON.stringify([...watched, movie]));
  }

  function handleDeleteWatch(id) {
    setWatched((watched) => watched.filter((movie) => movie.imdbID !== id));
  }

  return (
    <>
      <NavBar>
        <Logo />
        <Search query={query} setQuery={setQuery} />
        <NumResults movies={movies} />
      </NavBar>

      <Main>
        <Box>
          {isLoading && <Loader />}
          {!isLoading && !error && <MoviesList movies={movies} onSelectMovie={handleSelectMovie} />}
          {error && <ErrorMessage message={error} />}
        </Box>
        <Box>
          {selectedId ? (
            <MovieDetails
              selectedId={selectedId}
              onCloseMovie={handleCloseMovie}
              watched={watched}
              onAddWatched={handleAddWatch}
            />
          ) : (
            <>
              <WatchedSummary watched={watched} />
              <WatchedMoviesList watched={watched} onDeleteWatch={handleDeleteWatch} />
            </>
          )}
        </Box>
      </Main>
    </>
  );
}

function Loader() {
  return <p className="loader">Loading...</p>;
}

function ErrorMessage({ message }) {
  return (
    <p className="error">
      <span>⛔</span> {message}
    </p>
  );
}

function NavBar({ children }) {
  return <nav className="nav-bar">{children}</nav>;
}

function Logo() {
  return (
    <div className="logo">
      <span role="img">🍿</span>
      <h1>usePopcorn</h1>
    </div>
  );
}

function Search({ query, setQuery }) {
  const inputEl = useRef(null);

  useEffect(function () {
    inputEl.current.focus();
  }, []);

  useKey('Enter', function () {
    if (document.activeElement === inputEl.current) return;

    inputEl.current.focus();
    setQuery('');
  });

  return (
    <input
      className="search"
      type="text"
      placeholder="Search movies..."
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      ref={inputEl}
    />
  );
}

function NumResults({ movies }) {
  return (
    <p className="num-results">
      Found <strong>{movies.length}</strong> results
    </p>
  );
}

function Main({ children }) {
  return <main className="main">{children}</main>;
}

function Box({ children }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="box">
      <button className="btn-toggle" onClick={() => setIsOpen((open) => !open)}>
        {isOpen ? '–' : '+'}
      </button>
      {isOpen && children}
    </div>
  );
}

function MoviesList({ movies, onSelectMovie }) {
  return (
    <ul className="list list-movies">
      {movies?.map((movie) => (
        <Movie movie={movie} onSelectMovie={onSelectMovie} key={movie.imdbID} />
      ))}
    </ul>
  );
}

function Movie({ movie, onSelectMovie }) {
  return (
    <li onClick={() => onSelectMovie(movie.imdbID)}>
      <img src={movie.Poster} alt={`${movie.Title} poster`} />
      <h3>{movie.Title}</h3>
      <div>
        <p>
          <span>🗓</span>
          <span>{movie.Year}</span>
        </p>
      </div>
    </li>
  );
}

function MovieDetails({ selectedId, onCloseMovie, watched, onAddWatched }) {
  const [movie, setMovie] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [userRating, setUserRating] = useState(0);

  const countRef = useRef(0);

  const isWatched = watched.map((watchedMovie) => watchedMovie.imdbID).includes(movie.imdbID);
  const wathchedUserRating = watched.find((watchedMovie) => watchedMovie.imdbID === selectedId)?.userRating;

  const {
    Title: title,
    Poster: poster,
    Year: year,
    Runtime: runtime,
    imdbRating,
    Plot: plot,
    Released: released,
    Actors: actors,
    Director: director,
    Genre: genre,
  } = movie;

  function handleAdd() {
    if (isWatched) return;

    const newWatchedMovie = {
      imdbID: selectedId,
      title: title,
      year: year,
      poster: poster,
      imdbRating: Number(imdbRating),
      userRating: userRating,
      runtime: Number(runtime.split(' ')[0]),
      countRatingDecisions: countRef.current,
    };

    onAddWatched(newWatchedMovie);
    onCloseMovie();
  }

  useEffect(
    function () {
      const controller = new AbortController();

      async function getMovieDetails() {
        try {
          setIsLoading(true);
          setError('');

          const res = await fetch(`http://www.omdbapi.com/?apikey=${apiKey}&i=${selectedId}`, {
            signal: controller.signal,
          });

          if (!res.ok) {
            throw new Error('Something went wrong while getting movie details');
          }

          const data = await res.json();

          if (data.Response === 'False') {
            throw new Error(data.Error);
          }

          setMovie(data);
          setError('');
        } catch (err) {
          if (err.name !== 'AbortError') {
            console.log(err);
            setError(err);
          }
        } finally {
          setIsLoading(false);
        }
      }

      getMovieDetails();

      return function () {
        controller.abort();
      };
    },
    [selectedId, watched]
  );

  useEffect(
    function () {
      if (!title) return;

      document.title = `MOVIE | ${title}`;

      return function () {
        document.title = 'usePopcorn';
      };
    },
    [title]
  );

  useKey('Escape', onCloseMovie);

  useEffect(
    function () {
      if (userRating) countRef.current = countRef.current + 1;
    },
    [userRating]
  );

  return (
    <div className="details">
      {isLoading && <Loader />}
      {!isLoading && !error && (
        <>
          <header>
            <button className="btn-back" onClick={onCloseMovie}>
              &larr;
            </button>

            <img src={poster} alt={`Poster of ${movie}`} />
            <div className="details-overview">
              <h2>{title}</h2>
              <p>
                {released} &bull; {runtime}
              </p>
              <p>{genre}</p>
              <p>
                <span>⭐</span> {imdbRating} IMDb rating
              </p>
            </div>
          </header>

          <section>
            <div className="rating">
              {!isWatched ? (
                <>
                  <StarRating maxRating={10} size={24} onSetRating={(rating) => setUserRating(rating)} />

                  {userRating > 0 && (
                    <button className="btn-add" onClick={handleAdd}>
                      + add to list
                    </button>
                  )}
                </>
              ) : (
                <p>
                  You rated this movie <span>⭐</span>
                  {wathchedUserRating}/10
                </p>
              )}
            </div>

            <p>
              <em>{plot}</em>
            </p>
            <p>Starring {actors}</p>
            <p>Directed by {director}</p>
          </section>
        </>
      )}
      {error && (
        <div>
          <button className="btn-back" onClick={onCloseMovie}>
            &larr;
          </button>

          <ErrorMessage message={error.message} />
        </div>
      )}
    </div>
  );
}

function WatchedSummary({ watched }) {
  const avgImdbRating = average(watched.map((movie) => movie.imdbRating));
  const avgUserRating = average(watched.map((movie) => movie.userRating));
  const avgRuntime = average(watched.map((movie) => movie.runtime));

  return (
    <div className="summary">
      <h2>Movies you watched</h2>
      <div>
        <p>
          <span>#️⃣</span>
          <span>{watched.length} movies</span>
        </p>
        <p>
          <span>⭐️</span>
          <span>{avgImdbRating}</span>
        </p>
        <p>
          <span>🌟</span>
          <span>{avgUserRating}</span>
        </p>
        <p>
          <span>⏳</span>
          <span>{avgRuntime} min</span>
        </p>
      </div>
    </div>
  );
}

function WatchedMoviesList({ watched, onDeleteWatch }) {
  return (
    <ul className="list">
      {watched.map((movie) => (
        <WatchedMovie movie={movie} key={movie.imdbID} onDeleteWatch={onDeleteWatch} />
      ))}
    </ul>
  );
}

function WatchedMovie({ movie, onDeleteWatch }) {
  return (
    <li>
      <img src={movie.poster} alt={`${movie.title} poster`} />
      <h3>{movie.title}</h3>
      <div>
        <p>
          <span>⭐️</span>
          <span>{movie.imdbRating}</span>
        </p>
        <p>
          <span>🌟</span>
          <span>{movie.userRating}</span>
        </p>
        <p>
          <span>⏳</span>
          <span>{movie.runtime} min</span>
        </p>

        <button className="btn-delete" onClick={() => onDeleteWatch(movie.imdbID)}>
          X
        </button>
      </div>
    </li>
  );
}
