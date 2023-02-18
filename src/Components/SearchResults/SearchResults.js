import React from 'react';

import './SearchResults.css';

import TrackList from '../TrackList/TrackList';

class SearchResults extends React.Component {
  render() {
    return (
      <div className="SearchResults">
        <h2>Results</h2>
        <TrackList tracks={this.props.searchResults}
          onPlay={this.props.onPlay}
          onAdd={this.props.onAdd}
          playingId={this.props.playingId}
          isRemoval={false}
          showSong={this.props.showSong}
          />
      </div>
    )   
  }
}

export default SearchResults;