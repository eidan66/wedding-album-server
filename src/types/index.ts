export type AlbumItem = {
    id: string;
    url: string;
    type: 'image' | 'video';
    created_date: string;
    title?: string;
    uploader_name?: string;
  };