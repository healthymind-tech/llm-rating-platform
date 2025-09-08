import React from 'react';
import {
  Dialog,
  DialogContent,
  IconButton,
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Close, ZoomIn, ZoomOut } from '@mui/icons-material';

interface ImageModalProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  alt?: string;
}

export const ImageModal: React.FC<ImageModalProps> = ({
  open,
  onClose,
  imageSrc,
  alt = 'Image'
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [scale, setScale] = React.useState(1);

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleClose = () => {
    setScale(1);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      fullWidth
      sx={{
        '& .MuiDialog-paper': {
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          margin: isMobile ? 1 : 2,
          maxWidth: '95vw',
          maxHeight: '95vh',
          overflow: 'hidden',
        },
      }}
    >
      <DialogContent
        sx={{
          p: 0,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: isMobile ? '50vh' : '70vh',
          overflow: 'auto',
        }}
      >
        {/* Close Button */}
        <IconButton
          onClick={handleClose}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            color: 'white',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1,
            '&:hover': {
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
            },
          }}
        >
          <Close />
        </IconButton>

        {/* Zoom Controls */}
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            display: 'flex',
            gap: 1,
            zIndex: 1,
          }}
        >
          <IconButton
            onClick={handleZoomIn}
            disabled={scale >= 3}
            sx={{
              color: 'white',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
              },
              '&.Mui-disabled': {
                color: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            <ZoomIn />
          </IconButton>
          <IconButton
            onClick={handleZoomOut}
            disabled={scale <= 0.5}
            sx={{
              color: 'white',
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
              },
              '&.Mui-disabled': {
                color: 'rgba(255, 255, 255, 0.3)',
              },
            }}
          >
            <ZoomOut />
          </IconButton>
        </Box>

        {/* Image */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            height: '100%',
            overflow: 'auto',
            cursor: scale > 1 ? 'move' : 'zoom-in',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && scale === 1) {
              handleZoomIn();
            }
          }}
        >
          <img
            src={imageSrc}
            alt={alt}
            style={{
              maxWidth: scale === 1 ? '100%' : 'none',
              maxHeight: scale === 1 ? '100%' : 'none',
              transform: `scale(${scale})`,
              transformOrigin: 'center',
              transition: 'transform 0.2s ease-in-out',
              objectFit: 'contain',
              userSelect: 'none',
              pointerEvents: 'none',
            }}
          />
        </Box>

        {/* Scale Indicator */}
        {scale !== 1 && (
          <Box
            sx={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              color: 'white',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              px: 2,
              py: 1,
              borderRadius: 1,
              fontSize: '0.875rem',
              fontWeight: 'bold',
            }}
          >
            {Math.round(scale * 100)}%
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
};