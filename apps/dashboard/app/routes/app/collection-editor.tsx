import { useEffect, useState } from 'react';
import { Button } from '@ownlane/ui/components/button';
import { Input } from '@ownlane/ui/components/input';
import { Label } from '@ownlane/ui/components/label';
import { Textarea } from '@ownlane/ui/components/textarea';
import { toast } from '@ownlane/ui/components/sonner';
import { Link, useFetcher } from 'react-router';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@ownlane/ui/components/dialog';

import { PageHeader } from '../../components/page-header';
import { useWorkspacePath } from '../../lib/workspaces';

/** The collection workspace keeps editing controls beside a persistent public preview. */
export default function CollectionEditor() {
  const workspacePath = useWorkspacePath();
  const [adding, setAdding] = useState(false);
  const quickAdd = useFetcher();
  const [name, setName] = useState('Socials');
  const [description, setDescription] = useState('Find me around the web.');
  const [layout, setLayout] = useState<'list' | 'grid' | 'compact'>('grid');
  const examples = ['Instagram', 'LinkedIn', 'YouTube'];

  useEffect(() => {
    if (!quickAdd.data || typeof quickAdd.data !== 'object') return;
    const result = quickAdd.data as { saved?: string; error?: string };
    if (result.saved) {
      toast.success(result.saved);
      setAdding(false);
    }
    if (result.error) toast.error(result.error);
  }, [quickAdd.data]);

  return (
    <>
      <PageHeader
        action={
          <Button asChild variant="outline">
            <Link to="../links">Cancel</Link>
          </Button>
        }
        description="Build a collection and see exactly how it will appear on your public profile."
        title="Collection editor"
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <section className="space-y-6 rounded-xl border border-border/70 bg-card p-5 sm:p-6">
          <div className="space-y-4">
            <div>
              <h2 className="font-medium">Collection details</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Group related destinations, such as Socials, Courses, or Work.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="collection-name">Collection name</Label>
              <Input
                id="collection-name"
                onChange={(event) => setName(event.target.value)}
                value={name}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collection-description">Description</Label>
              <Textarea
                id="collection-description"
                onChange={(event) => setDescription(event.target.value)}
                value={description}
              />
            </div>
          </div>
          <div className="space-y-3 border-t border-border/70 pt-6">
            <div>
              <h2 className="font-medium">Presentation</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose how visitors browse this collection.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['list', 'grid', 'compact'] as const).map((choice) => (
                <Button
                  key={choice}
                  onClick={() => setLayout(choice)}
                  type="button"
                  variant={layout === choice ? 'default' : 'outline'}
                >
                  {choice}
                </Button>
              ))}
            </div>
          </div>
          <div className="border-t border-border/70 pt-6">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="font-medium">Links</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add and arrange the links in this collection.
                </p>
              </div>
              <Button onClick={() => setAdding(true)} type="button">
                Add link
              </Button>
            </div>
            {examples.map((item) => (
              <div
                className="mb-2 flex items-center justify-between rounded-lg border border-border/70 px-3 py-2"
                key={item}
              >
                <span className="text-sm font-medium">{item}</span>
                <Button size="sm" variant="ghost">
                  Edit
                </Button>
              </div>
            ))}
          </div>
        </section>
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Live preview
          </p>
          <div className="rounded-xl border border-border/70 bg-background p-5 shadow-sm">
            <h2 className="text-lg font-medium">{name || 'Untitled collection'}</h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            ) : null}
            <div className={layout === 'grid' ? 'mt-5 grid grid-cols-2 gap-2' : 'mt-5 space-y-2'}>
              {examples.map((item) => (
                <div
                  className="rounded-lg border border-border/70 bg-card px-3 py-3 text-sm font-medium"
                  key={item}
                >
                  {item}
                  <span className="float-right text-muted-foreground">↗</span>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
      <Dialog onOpenChange={setAdding} open={adding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add link</DialogTitle>
            <DialogDescription>Add it without leaving this collection workspace.</DialogDescription>
          </DialogHeader>
          <quickAdd.Form action={workspacePath('/links')} className="space-y-4" method="post">
            <input name="intent" type="hidden" value="create" />
            <input name="publicationStatus" type="hidden" value="live" />
            <div className="space-y-2">
              <Label htmlFor="collection-link-label">Label</Label>
              <Input id="collection-link-label" name="label" placeholder="Instagram" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collection-link-url">URL</Label>
              <Input
                id="collection-link-url"
                name="url"
                placeholder="https://example.com"
                required
                type="url"
              />
            </div>
            <DialogFooter>
              <Button
                disabled={quickAdd.state !== 'idle'}
                onClick={() => setAdding(false)}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
              <Button disabled={quickAdd.state !== 'idle'} type="submit">
                {quickAdd.state !== 'idle' ? 'Adding…' : 'Add link'}
              </Button>
            </DialogFooter>
          </quickAdd.Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
