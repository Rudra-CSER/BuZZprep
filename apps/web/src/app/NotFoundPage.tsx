import { Compass } from 'lucide-react';
import { Link } from 'react-router';
import { Page } from '@/components/Page';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';

export function NotFoundPage() {
  return (
    <Page title="Not found">
      <EmptyState
        icon={<Compass />}
        title="This page doesn’t exist"
        action={
          <Button asChild variant="tinted">
            <Link to="/">Go to Home</Link>
          </Button>
        }
      >
        The link may be old, or the item was removed.
      </EmptyState>
    </Page>
  );
}
