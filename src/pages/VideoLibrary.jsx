import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { buildApiUrl } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { PlayCircle, Plus, MoreHorizontal, LayoutGrid, Trash2, FolderPlus } from 'lucide-react';
import UploadVideoModal from '../components/UploadVideoModal';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
  DropdownMenuSeparator,
} from '../components/ui/dropdown-menu';


const VideoLibrary = () => {
  const [activeTab, setActiveTab] = useState('coach'); // 'student' or 'coach'
  const [studentVideos, setStudentVideos] = useState([]);
  const [coachResources, setCoachResources] = useState([]);
  const [folders, setFolders] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null); // null means "All"
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const { getAuthToken } = useAuth();

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getAuthToken();
      const headers = { Authorization: `Bearer ${token}` };
      
      let resourcesUrl = buildApiUrl('/resources/coach');
      if (activeFolder) {
        // This assumes filtering by folder will be a query param.
        // The backend controller needs to be updated to handle this.
        // For now, we will filter on the client side.
      }
      
      // Fetch resources and folders in parallel
      const [resourcesResponse, foldersResponse] = await Promise.all([
        axios.get(resourcesUrl, { headers }),
        axios.get(buildApiUrl('/resources/folders'), { headers })
      ]);

      if (resourcesResponse.data.success) {
        setCoachResources(resourcesResponse.data.data);
      } else {
        throw new Error(resourcesResponse.data.message || 'Failed to fetch coach resources');
      }

      if (foldersResponse.data.success) {
        setFolders(foldersResponse.data.data);
      } else {
        throw new Error(foldersResponse.data.message || 'Failed to fetch folders');
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchStudentVideos = async () => {
    // This can be implemented if needed for the student tab in the new design.
    // For now, focusing on the coach view as per the image.
  };

  useEffect(() => {
    if (activeTab === 'coach') {
      fetchData();
    } else {
      // fetchStudentVideos();
    }
  }, [activeTab]);

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    try {
      const token = getAuthToken();
      const response = await axios.post(buildApiUrl('/resources/folders'), 
        { name: newFolderName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (response.data.success) {
        setFolders([...folders, response.data.data]);
        setIsFolderModalOpen(false);
        setNewFolderName('');
      } else {
        throw new Error(response.data.message || 'Failed to create folder');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUploadSuccess = (newVideo) => {
    setCoachResources([newVideo, ...coachResources]);
    fetchData(); // Refetch to ensure all data is up to date
  };

  const handleDeleteResource = async (resourceId) => {
    if (!window.confirm('Are you sure you want to delete this resource? This cannot be undone.')) {
      return;
    }

    try {
      const token = getAuthToken();
      await axios.delete(buildApiUrl(`/resources/${resourceId}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Refetch data to update the view
      fetchData();
    } catch (err) {
      setError(err.message || 'Failed to delete resource.');
    }
  };

  const handleMoveResource = async (resourceId, folderId) => {
    try {
      const token = getAuthToken();
      await axios.patch(buildApiUrl(`/resources/${resourceId}`), 
        { folderId: folderId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchData(); // Refetch to update the view
    } catch (err) {
      setError(err.message || 'Failed to move resource.');
    }
  };

  const filteredResources = useMemo(() => {
    if (!activeFolder) {
      return coachResources;
    }
    return coachResources.filter(resource => resource.folderId === activeFolder);
  }, [activeFolder, coachResources]);

  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-80">
      <PlayCircle size={48} className="mb-4" />
      <p className="font-medium">Aucune vidéo trouvée</p>
      <p className="text-sm">Vos ressources téléchargées apparaîtront ici.</p>
    </div>
  );

  const renderVideoList = (videos) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {videos.map(video => (
        <div key={video.id} className="bg-card rounded-lg overflow-hidden group">
          <a href={video.fileUrl} target="_blank" rel="noopener noreferrer" className="block aspect-video bg-muted relative">
            <video src={video.fileUrl} className="w-full h-full object-cover" preload="metadata"></video>
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <PlayCircle size={48} className="text-white" />
            </div>
            {/* You can add video duration here if available from metadata */}
          </a>
          <div className="p-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold truncate">{video.title || video.fileName}</h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                   <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <span>Move to Folder</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={() => handleMoveResource(video.id, null)}>
                          <span>Uncategorized</span>
                        </DropdownMenuItem>
                        {folders.map(folder => (
                          <DropdownMenuItem key={folder.id} onClick={() => handleMoveResource(video.id, folder.id)}>
                            <span>{folder.name}</span>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => handleDeleteResource(video.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <p className="text-sm text-muted-foreground">
              {folders.find(f => f.id === video.folderId)?.name || 'Uncategorized'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">{new Date(video.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <div className="flex-1 flex flex-col h-full p-6 lg:p-8">
        <h1 className="text-3xl font-bold mb-6">Vidéothèque</h1>
        
        {/* Tabs */}
        <div className="flex border-b border-border mb-6">
          <button
            onClick={() => setActiveTab('eleves')}
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'eleves' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
          >
            Vidéos élèves
          </button>
          <button
            onClick={() => setActiveTab('coach')}
            className={`px-4 py-2 text-sm font-medium ${activeTab === 'coach' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground'}`}
          >
            Ressources coach
          </button>
        </div>

        {activeTab === 'coach' && (
          <>
            {/* Filters and Actions */}
            <div className="flex items-center justify-between mb-6 gap-4 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                {folders.map(folder => (
                  <Button 
                    key={folder.id} 
                    variant={activeFolder === folder.id ? 'default' : 'outline'}
                    onClick={() => setActiveFolder(activeFolder === folder.id ? null : folder.id)}
                  >
                    {folder.name}
                  </Button>
                ))}
                <Button variant="ghost" className="text-muted-foreground" onClick={() => setIsFolderModalOpen(true)}>
                  <FolderPlus size={16} className="mr-2"/>
                  nouveau dossier
                </Button>
              </div>
              <div className="flex items-center gap-2">
                 <Button variant="ghost" size="icon" onClick={() => alert('Layout switching feature coming soon!')}>
                    <LayoutGrid size={20} />
                </Button>
                <Button onClick={() => setIsUploadModalOpen(true)} className="bg-primary hover:bg-primary/90">
                  <Plus size={16} className="mr-2"/>
                  Ajouter une vidéo
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              {filteredResources.length} ressources
            </p>

            {loading && <p>Loading...</p>}
            {error && <p className="text-destructive">Error: {error}</p>}
            {!loading && !error && (
              filteredResources.length > 0 ? renderVideoList(filteredResources) : renderEmptyState()
            )}
          </>
        )}

        {activeTab === 'eleves' && (
           <div className="flex flex-col items-center justify-center text-center text-muted-foreground h-80">
            <p>Student videos section coming soon.</p>
          </div>
        )}
      </div>

      <UploadVideoModal 
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadSuccess}
        folders={folders}
      />

      <Dialog open={isFolderModalOpen} onOpenChange={setIsFolderModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for your new folder to help organize your resources.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateFolder}>
            <div className="py-4">
              <Input
                placeholder="Folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsFolderModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Folder</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VideoLibrary;
