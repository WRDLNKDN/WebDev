import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormHelperText,
  IconButton,
  MenuItem,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { CATEGORY_ORDER } from '../../../constants/platforms';
import type { LinkCategory } from '../../../types/profile';
import {
  dialogSelectSx,
  dialogTextFieldSx,
  filterSelectMenuProps,
} from '../../../theme/filterControls';
import {
  detectPlatformFromUrl,
  getShortLinkLabel,
} from '../../../lib/utils/linkPlatform';
import type { FieldLabelProps } from './EditLinksDialogTypes';
import { LinkIcon } from './LinkIcon';

type AddNewLinkSectionProps = {
  newCategory: LinkCategory | '';
  newPlatform: string;
  newUrl: string;
  newLabel: string;
  onCategoryChange: (value: LinkCategory | '') => void;
  setNewPlatform: (value: string) => void;
  onUrlInputChange: (value: string) => void;
  setNewLabel: (value: string) => void;
  availablePlatforms: Array<{ label: string; value: string }>;
  categoryError: boolean;
  platformError: boolean;
  addAttempted: boolean;
  urlSafetyError: string;
  isDuplicateUrl: boolean;
  isDuplicatePortfolioUrl: boolean;
  urlFormatError: boolean;
  canAddLink: boolean;
  onAddLink: () => void;
  addToListLabel: string;
  otherPlatformValue: string;
};

type CurrentLinksSectionProps = {
  duplicateLinksInList: string | null;
  linksOverlapPortfolio: boolean;
  linksLength: number;
  sortedLinks: Array<{
    id: string;
    category: string;
    platform: string;
    url: string;
    label?: string;
  }>;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onDelete: (id: string) => void;
};

const FieldLabel = ({ text, tooltip, required = false }: FieldLabelProps) => (
  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 0.5 }}>
    <Typography
      variant="caption"
      sx={{
        textTransform: 'uppercase',
        letterSpacing: 0.3,
        color: 'text.secondary',
      }}
    >
      {text}
      {required ? ' *' : ''}
    </Typography>
    <Tooltip title={tooltip}>
      <InfoOutlinedIcon sx={{ fontSize: 13, color: 'text.secondary' }} />
    </Tooltip>
  </Stack>
);

export const AddNewLinkSection = ({
  newCategory,
  newPlatform,
  newUrl,
  newLabel,
  onCategoryChange,
  setNewPlatform,
  onUrlInputChange,
  setNewLabel,
  availablePlatforms,
  categoryError,
  platformError,
  addAttempted,
  urlSafetyError,
  isDuplicateUrl,
  isDuplicatePortfolioUrl,
  urlFormatError,
  canAddLink,
  onAddLink,
  addToListLabel,
  otherPlatformValue,
}: AddNewLinkSectionProps) => (
  <Box
    sx={{
      p: 2,
      bgcolor: 'action.hover',
      borderRadius: 2,
      border: '1px dashed',
      borderColor: 'divider',
    }}
  >
    <Typography
      variant="subtitle2"
      sx={{ mb: 2, color: 'primary.main', fontWeight: 600 }}
    >
      ADD NEW LINK
    </Typography>
    <Stack spacing={2}>
      <Stack direction="row" spacing={2}>
        <FormControl fullWidth size="small" error={categoryError}>
          <FieldLabel
            text="Category"
            required
            tooltip="Choose the link grouping used on your profile."
          />
          <Select
            value={newCategory}
            displayEmpty
            renderValue={(v) => v || 'Choose Category'}
            MenuProps={filterSelectMenuProps}
            sx={dialogSelectSx}
            inputProps={{ 'aria-label': 'Category' }}
            onChange={(e) =>
              onCategoryChange(e.target.value as LinkCategory | '')
            }
          >
            <MenuItem value="">Choose Category</MenuItem>
            {CATEGORY_ORDER.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </Select>
          {categoryError && (
            <FormHelperText>Category is required.</FormHelperText>
          )}
        </FormControl>

        <FormControl
          fullWidth
          size="small"
          error={platformError}
          disabled={!newCategory}
        >
          <FieldLabel
            text="Platform"
            required
            tooltip="Select the service this URL points to."
          />
          <Select
            value={newPlatform}
            displayEmpty
            renderValue={(v) => v || 'Select platform'}
            MenuProps={filterSelectMenuProps}
            sx={dialogSelectSx}
            inputProps={{ 'aria-label': 'Platform' }}
            onChange={(e) => setNewPlatform(String(e.target.value))}
          >
            <MenuItem value="">Select platform</MenuItem>
            {availablePlatforms.map((p) => (
              <MenuItem key={p.value} value={p.value}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <LinkIcon
                    platform={p.value}
                    sx={{ width: 18, fontSize: '1rem' }}
                  />
                  <Typography variant="body2">{p.label}</Typography>
                </Stack>
              </MenuItem>
            ))}
          </Select>
          {platformError && (
            <FormHelperText>Platform is required.</FormHelperText>
          )}
        </FormControl>
      </Stack>

      <Box>
        <FieldLabel text="URL" required tooltip="Public URL for this link." />
        <TextField
          placeholder="https://example.com"
          size="small"
          fullWidth
          value={newUrl}
          onChange={(e) => onUrlInputChange(e.target.value)}
          disabled={!newCategory}
          error={Boolean(
            (newUrl.trim() &&
              (isDuplicateUrl || isDuplicatePortfolioUrl || urlSafetyError)) ||
              (addAttempted && urlFormatError),
          )}
          helperText={
            newUrl.trim() && urlSafetyError
              ? urlSafetyError
              : newUrl.trim() && isDuplicatePortfolioUrl
                ? 'This URL is already used in your portfolio.'
                : newUrl.trim() && isDuplicateUrl
                  ? 'This URL is already in your links.'
                  : addAttempted && urlFormatError
                    ? 'Enter a valid URL.'
                    : ''
          }
          sx={dialogTextFieldSx}
        />
      </Box>

      {(newCategory === 'Custom' || newPlatform === otherPlatformValue) && (
        <Box>
          <FieldLabel
            text="Label"
            tooltip="Optional short name to display for this custom link."
          />
          <TextField
            placeholder="e.g. My Portfolio"
            size="small"
            fullWidth
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            sx={dialogTextFieldSx}
          />
        </Box>
      )}

      <Button
        variant="outlined"
        onClick={onAddLink}
        disabled={!canAddLink}
        sx={{ alignSelf: 'flex-start' }}
      >
        {addToListLabel}
      </Button>
    </Stack>
  </Box>
);

export const CurrentLinksSection = ({
  duplicateLinksInList,
  linksOverlapPortfolio,
  linksLength,
  sortedLinks,
  onMoveUp,
  onMoveDown,
  onDelete,
}: CurrentLinksSectionProps) => (
  <Stack spacing={2}>
    {(duplicateLinksInList || linksOverlapPortfolio) && (
      <Alert severity="error">
        {duplicateLinksInList
          ? 'Duplicate URLs are already present in this list. Remove the duplicate before saving.'
          : 'A link URL is already used in your portfolio. Use a different URL or remove it from portfolio first.'}
      </Alert>
    )}
    <Typography
      variant="subtitle2"
      sx={{ color: 'text.secondary', fontWeight: 600 }}
    >
      CURRENT LINKS
    </Typography>
    {linksLength === 0 && (
      <Typography
        variant="body2"
        color="text.disabled"
        align="center"
        fontStyle="italic"
      >
        No links added yet.
      </Typography>
    )}
    {CATEGORY_ORDER.map((category) => {
      const categoryLinks = sortedLinks.filter(
        (link) => link.category === category,
      );
      if (categoryLinks.length === 0) return null;
      return (
        <Stack
          key={category}
          spacing={1}
          data-testid={`edit-link-group-${category}`}
        >
          <Typography
            variant="overline"
            sx={{ color: 'text.secondary', letterSpacing: 1, fontWeight: 700 }}
          >
            {category}
          </Typography>
          {categoryLinks.map((link) => {
            const platformForIcon =
              link.platform?.trim() || detectPlatformFromUrl(link.url);
            const globalIndex = sortedLinks.findIndex((l) => l.id === link.id);
            const canMoveUp = globalIndex > 0;
            const canMoveDown =
              globalIndex >= 0 && globalIndex < sortedLinks.length - 1;
            return (
              <Box
                key={link.id}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 1.5,
                  p: 2,
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'rgba(255,255,255,0.04)',
                }}
              >
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={2}
                  sx={{ overflow: 'hidden', flex: 1, minWidth: 0 }}
                >
                  <LinkIcon platform={platformForIcon} />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="body2"
                      fontWeight={600}
                      noWrap
                      data-testid="edit-link-label"
                    >
                      {getShortLinkLabel(link.url)}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      noWrap
                      display="block"
                    >
                      {link.url}
                    </Typography>
                  </Box>
                </Stack>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={0.25}
                  sx={{ flexShrink: 0 }}
                >
                  <Tooltip title="Move up">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => onMoveUp(link.id)}
                        disabled={!canMoveUp}
                      >
                        <KeyboardArrowUpIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Move down">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => onMoveDown(link.id)}
                        disabled={!canMoveDown}
                      >
                        <KeyboardArrowDownIcon sx={{ fontSize: 18 }} />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title={`Remove ${link.label || link.platform}`}>
                    <IconButton
                      size="small"
                      onClick={() => onDelete(link.id)}
                      aria-label={`Remove ${link.label || link.platform}`}
                      sx={{ color: 'error.main' }}
                    >
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Box>
            );
          })}
        </Stack>
      );
    })}
  </Stack>
);
