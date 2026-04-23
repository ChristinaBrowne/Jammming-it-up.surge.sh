import React, { Component } from 'react';
import './App.css';

import Playlist from '../Playlist/Playlist';
import SearchBar from '../SearchBar/SearchBar';
import SearchResults from '../SearchResults/SearchResults';
import Spotify from '../../util/Spotify';

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      audio: new Audio(),
      trackdata: null,
      searchResults: [],
      errorMessage: '',
      playlistName: 'New Playlist',
      playlistTracks: [],
      playing: false,
      playingTrackId: null
    };

    this.search = this.search.bind(this);
    this.resume = this.resume.bind(this);
    this.pause = this.pause.bind(this);
    this.addTrack = this.addTrack.bind(this);
    this.removeTrack = this.removeTrack.bind(this);
    this.updatePlaylistName = this.updatePlaylistName.bind(this);
    this.savePlaylist = this.savePlaylist.bind(this);
    this.showSong = this.showSong.bind(this);
    //showSong
  }

  componentDidMount() {
    this.state.audio.addEventListener('ended', () => {
      this.setState({ playing: false });
    });
  }

  showSong(trackId){
    console.log('asfasfa', trackId);
    this.setState({playingTrackId : trackId});

  }

  play(track) {
    const { audio } = this.state;

    if (track.preview_url) {
      audio.src = track.preview_url;
      audio.play();
      this.setState({ playing: true });
    }
  }

  startPlaying(trackuri) {
    // const { audio } = this.state;
    const trackid = trackuri.split(':')[2];

    Spotify.getTrack(trackid).then((trackdata) => {
      this.setState({ trackdata });
      this.play(trackdata);
    });
  }

  stopPlaying() {
    const { audio } = this.state;
    audio.pause();
    audio.currentTime = 0;
    this.setState({ playing: false });
  }

  pause() {
    const { audio } = this.state;
    audio.pause();
    this.setState({ playing: false });
  }

  resume() {
    const { audio } = this.state;
    audio.play();
    this.setState({ playing: true });
  }

  search(term) {
    Spotify.search(term)
      .then(searchResults => {
        this.setState({ searchResults, errorMessage: '' });
      })
      .catch((error) => {
        console.error(error);
        this.setState({
          searchResults: [],
          errorMessage: error.message || 'Spotify search failed.'
        });
      });
  }

  addTrack(track) {
    let tracks = this.state.playlistTracks;
    if (!tracks.find(t => t.id === track.id)) {
      tracks.push(track);
      this.setState({ playlistTracks: tracks });
    }
  }

  removeTrack(track) {
    let tracks = this.state.playlistTracks.filter(t => t.id !== track.id);
    this.setState({ playlistTracks: tracks });
    }

  updatePlaylistName(name) {
    this.setState({ playlistName: name });
  }

  savePlaylist() {
    const trackUris = this.state.playlistTracks.map(track => track.uri);
    Spotify.savePlaylist(this.state.playlistName, trackUris).then(() => {
      this.setState({
        playlistName: 'New Playlist',
        playlistTracks: []
      });
    });
  }

  render() {
    return (
      <div>
        <h1>Ja<span className="highlight">mmm</span>ing</h1>
        <div className="App">
          <SearchBar onSearch={this.search} />
          {this.state.errorMessage ? <p>{this.state.errorMessage}</p> : null}
          <div className="App-playlist">
            <SearchResults
              searchResults={this.state.searchResults}
              onPlay={this.play.bind(this)}
                           onAdd={this.addTrack} 
                           playingId={this.state.playingTrackId}
                           showSong={this.showSong}
                           />
            <Playlist playlistTracks={this.state.playlistTracks}
                      onNameChange={this.updatePlaylistName}
                      startPlaying={this.startPlaying}
                      play={this.play}
                      pause={this.pause}
                      resume={this.resume}
                      onRemove={this.removeTrack} 
                      onSave={this.savePlaylist}

                       />
          </div>
        </div>
      </div>
    );
  }
}

export default App;
