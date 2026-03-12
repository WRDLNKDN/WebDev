import SearchIcon from '@mui/icons-material/Search';
import {
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { filterSelectMenuProps } from '../../theme/filterControls';
import { DirectoryFilterChips } from './directoryFilterChips';

const FILTER_CONTROL_HEIGHT = 40;
const DIRECTORY_SEARCH_MAX_CHARS = 500;

type Props = {
  q: string;
  primaryIndustry: string;
  secondaryIndustry: string;
  locationInput: string;
  setLocationInput: (value: string) => void;
  skills: string[];
  connectionStatus: string;
  sort: string;
  showSecondaryIndustryFilter: boolean;
  setShowSecondaryIndustryFilter: (value: boolean) => void;
  hasActiveFilters: boolean;
  updateUrl: (updates: Record<string, string>) => void;
};

export const DirectoryFilters = ({
  q,
  primaryIndustry,
  secondaryIndustry,
  locationInput,
  setLocationInput,
  skills,
  connectionStatus,
  sort,
  showSecondaryIndustryFilter,
  setShowSecondaryIndustryFilter,
  hasActiveFilters,
  updateUrl,
}: Props) => (
  <Paper
    elevation={0}
    sx={{
      p: { xs: 2, sm: 2.5, md: 3 },
      borderRadius: 3,
      bgcolor: 'rgba(18,22,36,0.85)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(156,187,217,0.20)',
      mb: { xs: 2, md: 3 },
    }}
  >
    <Typography
      variant="h5"
      sx={{
        fontWeight: 700,
        mb: 2,
        fontSize: { xs: '1.2rem', sm: '1.4rem', md: '1.5rem' },
      }}
    >
      Discover Members
    </Typography>

    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={1.5}
      alignItems={{ xs: 'stretch', sm: 'center' }}
      sx={{ mb: 2 }}
    >
      <TextField
        fullWidth
        size="small"
        placeholder="Search by name, tagline, industry, location, skills..."
        value={q}
        onChange={(e) =>
          updateUrl({ q: e.target.value.slice(0, DIRECTORY_SEARCH_MAX_CHARS) })
        }
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon
                sx={{ color: 'rgba(255,255,255,0.35)', fontSize: 20 }}
              />
            </InputAdornment>
          ),
          inputProps: { maxLength: DIRECTORY_SEARCH_MAX_CHARS },
        }}
        sx={{
          flex: 1,
          '& .MuiOutlinedInput-root': {
            height: FILTER_CONTROL_HEIGHT,
            minHeight: FILTER_CONTROL_HEIGHT,
            bgcolor: 'rgba(56,132,210,0.10)',
            borderRadius: 2,
            color: '#FFFFFF',
            '& fieldset': { borderColor: 'rgba(156,187,217,0.28)' },
            '&:hover fieldset': { borderColor: 'rgba(141,188,229,0.42)' },
            '&.Mui-focused fieldset': {
              borderColor: '#3884D2',
              borderWidth: '1.5px',
            },
          },
          '& .MuiInputBase-input::placeholder': {
            color: 'rgba(141,188,229,0.50)',
            opacity: 1,
            fontSize: '0.875rem',
          },
        }}
      />

      <FormControl
        size="small"
        sx={{ flexShrink: 0, minWidth: { xs: '100%', sm: 170 } }}
      >
        <InputLabel
          id="dir-sort-label"
          sx={{
            color: 'rgba(255,255,255,0.45)',
            fontSize: '0.8rem',
            top: '-2px',
            '&.Mui-focused': { color: '#3884D2' },
            '&.MuiInputLabel-shrink': { top: 0 },
          }}
        >
          Sort
        </InputLabel>
        <Select
          labelId="dir-sort-label"
          label="Sort"
          value={sort}
          onChange={(e) => updateUrl({ sort: e.target.value })}
          MenuProps={filterSelectMenuProps}
          sx={{
            height: FILTER_CONTROL_HEIGHT,
            minHeight: FILTER_CONTROL_HEIGHT,
            borderRadius: 2,
            bgcolor: 'rgba(56,132,210,0.10)',
            color: 'rgba(255,255,255,0.85)',
            fontWeight: 600,
            fontSize: '0.875rem',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(156,187,217,0.28)',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(141,188,229,0.42)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#3884D2',
              borderWidth: '1.5px',
            },
            '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.45)' },
            '& .MuiSelect-select': {
              py: '9px',
              pl: 1.75,
              pr: '32px !important',
              minHeight: FILTER_CONTROL_HEIGHT,
              boxSizing: 'border-box',
            },
          }}
        >
          <MenuItem value="recently_active">Recently Active</MenuItem>
          <MenuItem value="alphabetical">Alphabetical</MenuItem>
          <MenuItem value="newest">Newest Members</MenuItem>
        </Select>
      </FormControl>
    </Stack>

    <DirectoryFilterChips
      q={q}
      primaryIndustry={primaryIndustry}
      secondaryIndustry={secondaryIndustry}
      locationInput={locationInput}
      setLocationInput={setLocationInput}
      skills={skills}
      connectionStatus={connectionStatus}
      showSecondaryIndustryFilter={showSecondaryIndustryFilter}
      setShowSecondaryIndustryFilter={setShowSecondaryIndustryFilter}
      hasActiveFilters={hasActiveFilters}
      updateUrl={updateUrl}
    />
  </Paper>
);
