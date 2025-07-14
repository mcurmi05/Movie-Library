import { useState } from 'react';
import Box from '@mui/material/Box';
import Rating from '@mui/material/Rating';
import Modal from '@mui/material/Modal';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { styled } from '@mui/material/styles';

const StyledRating = styled(Rating)({
  '& .MuiRating-iconFilled': {
    color: '#ff0000ff',
  },
  '& .MuiRating-iconHover': {
    color: '#ff0000ff',
  },
});

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: '#1a1a1a',
  color: 'white',
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  fontWeight:'bold'
};

export default function RatingModal({ open, onClose, onRate, currentRating = 0, movieTitle }) {
  const [value, setValue] = useState(currentRating);

  const handleRatingChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleSubmit = () => {
    if (value > 0) {
      onRate(value);
      onClose();
    }
  };

  const handleClose = () => {
    setValue(currentRating); // Reset to original value
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      aria-labelledby="rating-modal-title"
    >
      <Box sx={modalStyle}>
        
        <Typography variant="body1" sx={{ mb: 3, textAlign: 'center', fontWeight:'bold' }}>
          {movieTitle}
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
          <StyledRating
            name="movie-rating"
            value={value}
            onChange={handleRatingChange}
            max={10}
            size="large"
          />
          <Typography variant="body2" sx={{ mt: 1, color: '#ffffffff' , fontWeight:'bold' }}>
            {value ? `${value}/10` : 'No rating'}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button 
            variant="outlined" 
            onClick={handleClose}
            sx={{ 
              color: 'white', 
              borderColor: '#666',
              '&:hover': { borderColor: '#888' },
              fontWeight:'bold' ,
              textTransform: 'none'

            }}
          >
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSubmit}
            disabled={!value}
            sx={{ 
              backgroundColor: '#ff0000ff',
              '&:hover': { backgroundColor: '#ff0000ff' },
              fontWeight:'bold' ,
              textTransform: 'none'
            }}
          >
            Rate
          </Button>
        </Box>
      </Box>
    </Modal>
  );
}