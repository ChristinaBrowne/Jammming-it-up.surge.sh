import React from 'react';

import './TrackList.css';

import Track from '../Track/Track';

class TrackList extends React.Component {

  

  render() {
    return (
      <div className="TrackList">
        {
          this.props.tracks.map(track => {
            return <Track track={track} 
              key={track.id}
              onPlay={this.props.onPlay}
              onAdd={this.props.onAdd} 
              onRemove={this.props.onRemove}
              isRemoval={this.props.isRemoval} 
              playingId={this.props.playingId}
              showSong={this.props.showSong}
              />
          })
        }
      </div>
    )
  }
}

export default TrackList;