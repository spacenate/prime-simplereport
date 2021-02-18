package gov.cdc.usds.simplereport.db.model;

/**
 * Marker interface for an entity that gets soft-deleted when it is "destroyed".
 */
public interface Eternal {

    public boolean isDeleted();

    public void setIsDeleted(Boolean deleted);

}