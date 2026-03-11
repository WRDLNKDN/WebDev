import AddIcon from '@mui/icons-material/Add';
import FilterAltOutlinedIcon from '@mui/icons-material/FilterAltOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import {
  Box,
  Button,
  Chip,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import {
  getSecondaryOptionsForPrimary,
  INDUSTRY_PRIMARY_OPTIONS,
} from '../../constants/industryTaxonomy';
import { filterSelectMenuProps } from '../../theme/filterControls';
import { INTERACTION_COLORS } from '../../theme/themeConstants';

const CONNECTION_LABEL: Record<string, string> = {
  not_connected: 'Not connected',
  pending: 'Pending',
  pending_received: 'Pending received',
  connected: 'Connected',
};

const FILTER_CONTROL_HEIGHT = 40;
const ACTIVE_FILTER_SX = {
  color: '#fff',
  fontWeight: 700,
  textDecoration: 'underline',
  textUnderlineOffset: '4px',
  boxShadow: `inset 0 0 0 1px ${INTERACTION_COLORS.comment}`,
} as const;

const filterChipSx = {
  height: FILTER_CONTROL_HEIGHT,
  minHeight: FILTER_CONTROL_HEIGHT,
  borderRadius: 5,
  border: '1.5px solid rgba(255,255,255,0.18)',
  bgcolor: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.85)',
  fontWeight: 500,
  fontSize: '0.8rem',
  textTransform: 'none',
  px: 1.5,
  '&:hover': {
    bgcolor: 'rgba(255,255,255,0.1)',
    borderColor: 'rgba(255,255,255,0.3)',
  },
  '&[aria-pressed="true"]': ACTIVE_FILTER_SX,
  '& .MuiButton-endIcon': { ml: 0.5 },
} as const;

const chipSelectSx = {
  height: FILTER_CONTROL_HEIGHT,
  minHeight: FILTER_CONTROL_HEIGHT,
  borderRadius: 5,
  '& .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: '1.5px',
  },
  '&:hover .MuiOutlinedInput-notchedOutline': {
    borderColor: 'rgba(255,255,255,0.3)',
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: INTERACTION_COLORS.comment,
    borderWidth: '1.5px',
  },
  bgcolor: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.85)',
  fontWeight: 500,
  fontSize: '0.8rem',
  '& .MuiSelect-select': {
    py: '9px',
    px: 1.5,
    pr: '28px !important',
    display: 'flex',
    alignItems: 'center',
    minHeight: FILTER_CONTROL_HEIGHT,
    boxSizing: 'border-box',
  },
  '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.5)', right: 6 },
  '&[aria-pressed="true"]': ACTIVE_FILTER_SX,
} as const;

type Props = {
  q: string;
  primaryIndustry: string;
  secondaryIndustry: string;
  locationInput: string;
  setLocationInput: (value: string) => void;
  skills: string[];
  connectionStatus: string;
  showSecondaryIndustryFilter: boolean;
  setShowSecondaryIndustryFilter: (value: boolean) => void;
  hasActiveFilters: boolean;
  updateUrl: (updates: Record<string, string>) => void;
};

export const DirectoryFilterChips = ({
  q,
  primaryIndustry,
  secondaryIndustry,
  locationInput,
  setLocationInput,
  skills,
  connectionStatus,
  showSecondaryIndustryFilter,
  setShowSecondaryIndustryFilter,
  hasActiveFilters,
  updateUrl,
}: Props) => (
  <Box data-testid="directory-filters">
    <Stack direction="row" flexWrap="wrap" alignItems="center" gap={1}>
      <Typography
        variant="caption"
        sx={{
          color: 'rgba(255,255,255,0.4)',
          fontWeight: 600,
          mr: 0.25,
          flexShrink: 0,
        }}
      >
        Filters:
      </Typography>

      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 1,
          minWidth: 0,
        }}
      >
        <Select
          value={primaryIndustry}
          displayEmpty
          inputProps={{ 'aria-label': 'Primary Industry' }}
          renderValue={(v) => v || 'Primary Industry'}
          onChange={(e) => {
            const nextPrimary = e.target.value;
            const allowed = getSecondaryOptionsForPrimary(nextPrimary);
            updateUrl({
              primary_industry: nextPrimary,
              secondary_industry: allowed.includes(secondaryIndustry)
                ? secondaryIndustry
                : '',
            });
          }}
          MenuProps={filterSelectMenuProps}
          IconComponent={KeyboardArrowDownIcon}
          sx={{
            ...chipSelectSx,
            '& .MuiSelect-select': {
              ...chipSelectSx['& .MuiSelect-select'],
              fontWeight: primaryIndustry ? 600 : 500,
              color: primaryIndustry ? '#fff' : 'rgba(255,255,255,0.7)',
              minWidth: 110,
            },
            ...(primaryIndustry ? ACTIVE_FILTER_SX : null),
            ...(primaryIndustry
              ? {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: `${INTERACTION_COLORS.comment} !important`,
                  },
                }
              : {}),
          }}
        >
          <MenuItem value="">
            <em>Any industry</em>
          </MenuItem>
          {INDUSTRY_PRIMARY_OPTIONS.map((opt) => (
            <MenuItem key={opt} value={opt}>
              {opt}
            </MenuItem>
          ))}
        </Select>

        {primaryIndustry || showSecondaryIndustryFilter ? (
          <Select
            value={secondaryIndustry}
            displayEmpty
            inputProps={{ 'aria-label': 'Sub-industry' }}
            renderValue={(v) => v || 'Sub-industry'}
            onChange={(e) => updateUrl({ secondary_industry: e.target.value })}
            MenuProps={filterSelectMenuProps}
            IconComponent={KeyboardArrowDownIcon}
            sx={{
              ...chipSelectSx,
              '& .MuiSelect-select': {
                ...chipSelectSx['& .MuiSelect-select'],
                fontWeight: secondaryIndustry ? 600 : 500,
                color: secondaryIndustry ? '#fff' : 'rgba(255,255,255,0.7)',
                minWidth: 100,
              },
              ...(secondaryIndustry ? ACTIVE_FILTER_SX : null),
              ...(secondaryIndustry
                ? {
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: `${INTERACTION_COLORS.comment} !important`,
                    },
                  }
                : {}),
            }}
          >
            <MenuItem value="">
              <em>Any sub-industry</em>
            </MenuItem>
            {getSecondaryOptionsForPrimary(primaryIndustry).map((opt) => (
              <MenuItem key={opt} value={opt}>
                {opt}
              </MenuItem>
            ))}
          </Select>
        ) : (
          <Button
            size="small"
            variant="outlined"
            startIcon={<AddIcon sx={{ fontSize: '0.9rem !important' }} />}
            onClick={() => setShowSecondaryIndustryFilter(true)}
            aria-pressed={showSecondaryIndustryFilter}
            sx={{
              ...filterChipSx,
              ...(showSecondaryIndustryFilter ? ACTIVE_FILTER_SX : null),
            }}
          >
            Add secondary filter
          </Button>
        )}

        <Select
          value={connectionStatus}
          displayEmpty
          inputProps={{ 'aria-label': 'Connection' }}
          renderValue={(v) => (v ? (CONNECTION_LABEL[v] ?? v) : 'Connection')}
          onChange={(e) => updateUrl({ connection_status: e.target.value })}
          MenuProps={filterSelectMenuProps}
          IconComponent={KeyboardArrowDownIcon}
          sx={{
            ...chipSelectSx,
            '& .MuiSelect-select': {
              ...chipSelectSx['& .MuiSelect-select'],
              fontWeight: connectionStatus ? 600 : 500,
              color: connectionStatus ? '#fff' : 'rgba(255,255,255,0.7)',
              minWidth: 95,
            },
            ...(connectionStatus ? ACTIVE_FILTER_SX : null),
            ...(connectionStatus
              ? {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: `${INTERACTION_COLORS.comment} !important`,
                  },
                }
              : {}),
          }}
        >
          <MenuItem value="">
            <em>Any</em>
          </MenuItem>
          <MenuItem value="not_connected">Not connected</MenuItem>
          <MenuItem value="pending">Pending</MenuItem>
          <MenuItem value="pending_received">Pending received</MenuItem>
          <MenuItem value="connected">Connected</MenuItem>
        </Select>
      </Box>

      <Box
        component="form"
        onSubmit={(e) => {
          e.preventDefault();
          updateUrl({ location: locationInput });
        }}
        sx={{
          display: 'flex',
          alignItems: 'center',
          ml: { md: 'auto' },
          width: { xs: '100%', sm: 'auto' },
        }}
      >
        <TextField
          size="small"
          placeholder="Location"
          value={locationInput}
          onChange={(e) => setLocationInput(e.target.value)}
          onBlur={() => updateUrl({ location: locationInput })}
          sx={{
            width: { xs: '100%', sm: 'auto' },
            '& .MuiOutlinedInput-root': {
              ...chipSelectSx,
              height: FILTER_CONTROL_HEIGHT,
              minHeight: FILTER_CONTROL_HEIGHT,
              color: locationInput ? '#fff' : 'rgba(255,255,255,0.7)',
              '& fieldset': {
                borderColor: locationInput
                  ? INTERACTION_COLORS.comment
                  : 'rgba(255,255,255,0.18)',
                borderWidth: '1.5px',
              },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
              '&.Mui-focused fieldset': {
                borderColor: INTERACTION_COLORS.comment,
              },
              '& input': {
                py: '9px',
                px: 1.5,
                minWidth: 80,
                maxWidth: { xs: '100%', sm: 180 },
                fontWeight: locationInput ? 600 : 500,
                boxSizing: 'border-box',
                ...(locationInput
                  ? {
                      textDecoration: 'underline',
                      textUnderlineOffset: '4px',
                    }
                  : null),
              },
              '& input::placeholder': {
                color: 'rgba(255,255,255,0.5)',
                opacity: 1,
                fontSize: '0.8rem',
              },
            },
          }}
        />
      </Box>
    </Stack>

    {q.trim() || skills.length > 0 || hasActiveFilters ? (
      <Stack
        direction="row"
        flexWrap="wrap"
        alignItems="center"
        gap={1}
        sx={{ mt: 1.25 }}
      >
        {q.trim() ? (
          <Chip
            size="small"
            icon={<FilterAltOutlinedIcon fontSize="small" />}
            label={`"${q.length > 20 ? `${q.slice(0, 20)}…` : q}"`}
            onDelete={() => updateUrl({ q: '' })}
            sx={{
              bgcolor: 'rgba(0,163,224,0.15)',
              border: `1px solid ${INTERACTION_COLORS.comment}`,
              color: '#d9f7ff',
              height: 28,
              fontWeight: 700,
              textDecoration: 'underline',
              textUnderlineOffset: '4px',
              '& .MuiChip-icon': { color: 'inherit' },
            }}
          />
        ) : null}
        {skills.map((s) => (
          <Chip
            key={s}
            size="small"
            label={s}
            onDelete={() =>
              updateUrl({ skills: skills.filter((x) => x !== s).join(',') })
            }
            sx={{
              bgcolor: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.75)',
              height: 28,
              '& .MuiChip-deleteIcon': { color: 'inherit' },
            }}
          />
        ))}
        {hasActiveFilters ? (
          <Button
            size="small"
            variant="text"
            onClick={() => {
              updateUrl({
                q: '',
                primary_industry: '',
                secondary_industry: '',
                location: '',
                connection_status: '',
                skills: '',
              });
              setShowSecondaryIndustryFilter(false);
            }}
            sx={{
              color: 'rgba(255,255,255,0.4)',
              textTransform: 'none',
              fontSize: '0.78rem',
              fontWeight: 600,
              px: 0.5,
              '&:hover': {
                color: 'rgba(255,255,255,0.7)',
                bgcolor: 'transparent',
              },
            }}
          >
            Clear all
          </Button>
        ) : null}
      </Stack>
    ) : null}
  </Box>
);
