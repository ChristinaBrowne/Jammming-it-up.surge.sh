import React from 'react';

import './Track.css';
import playBtn from '../../media/btn-play.png';

class Track extends React.Component {
  constructor(props) {
    super(props);

    this.addTrack = this.addTrack.bind(this);
    this.removeTrack = this.removeTrack.bind(this);
    this.onPlay = this.onPlay.bind(this);
    this.onPause = this.onPause.bind(this);
    this.onPlayIntent = this.onPlayIntent.bind(this);
  }

  onPlayIntent(_id){
    const { showSong, track } = this.props;
    showSong(track.id);
  }

  onPlay() {
    const { track, onPlay } = this.props;
    onPlay(track.preview_url);
  }

  onPause() {
    const { onPause } = this.props;
    onPause();
  }

  addTrack() {
    const { onAdd, track } = this.props;
    onAdd(track);
  }

  removeTrack() {
    const { onRemove, track } = this.props;
    onRemove(track);
  }

  renderAction() {
    const { isRemoval } = this.props;

    if (isRemoval) {
      return <button className="Track-action" onClick={this.removeTrack}>-</button>;
    } else {
      return <button className="Track-action" onClick={this.addTrack}>+</button>;
    }
  }

  render() {
    const { track, /* isPlaying, */ playingId } = this.props;
    const audioType = this.props.audioType ? "audio/ogg" : "audio/mpeg";
    console.log(`Title: ${track.name}`);    
    console.log(`playingId: ${playingId}`);
    console.log(`track.id: ${track.id}`);
    let audioElement;
    let playCBtn;
    if(track.id === playingId){
      audioElement = 
      <video controls className="Track-sample">
        <source src={track.preview_url} 
                type={audioType} 
                ref={this.props.audioRef} />
      </video>
    }

    if(track.id !== playingId){
      playCBtn =  <button className="Play-action">
      <img src={playBtn} onClick={this.onPlayIntent} alt="" />
    </button>
    }
    return (
      <div  className="Track">
        <div className="Track-information">
          <h3>{track.name}</h3>
          <p>{track.artist} | {track.album} </p>
        </div>
       {
        playCBtn
       }
        {
        audioElement
        }
        {this.renderAction()}
        
      </div>
    );
  }
}

export default Track;
